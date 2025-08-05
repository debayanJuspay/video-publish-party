-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('account_owner', 'editor', 'admin');

-- Create accounts table for YouTube account management
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  youtube_channel_id TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, account_id)
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  youtube_video_id TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID, account_id UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_roles.user_id = $1 AND user_roles.account_id = $2;
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
$$;

-- RLS Policies for accounts
CREATE POLICY "Users can view accounts they have access to" ON public.accounts
FOR SELECT USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND account_id = accounts.id)
);

CREATE POLICY "Account owners can manage their accounts" ON public.accounts
FOR ALL USING (owner_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their accounts" ON public.user_roles
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_id = auth.uid()) OR
  public.is_admin(auth.uid())
);

CREATE POLICY "Account owners can manage roles" ON public.user_roles
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_id = auth.uid()) OR
  public.is_admin(auth.uid())
);

-- RLS Policies for videos
CREATE POLICY "Users can view videos in their accounts" ON public.videos
FOR SELECT USING (
  uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND account_id = videos.account_id) OR
  public.is_admin(auth.uid())
);

CREATE POLICY "Editors can create videos" ON public.videos
FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND (
    public.get_user_role(auth.uid(), account_id) IN ('editor', 'account_owner') OR
    public.is_admin(auth.uid())
  )
);

CREATE POLICY "Editors can update their own videos" ON public.videos
FOR UPDATE USING (
  uploaded_by = auth.uid() AND status = 'pending'
);

CREATE POLICY "Admins can manage all videos" ON public.videos
FOR ALL USING (public.is_admin(auth.uid()));

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);

-- Storage policies
CREATE POLICY "Users can upload videos to their accounts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND 
    role IN ('editor', 'account_owner', 'admin')
  )
);

CREATE POLICY "Users can view videos they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'videos' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    public.is_admin(auth.uid())
  )
);

CREATE POLICY "Anyone can view thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'thumbnails');

-- Create triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();