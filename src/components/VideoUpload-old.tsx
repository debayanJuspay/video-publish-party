import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, FileVideo } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete: () => void;
}

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAccounts();
  }, [user]);

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          user_roles!inner(role)
        `)
        .eq('user_roles.user_id', user?.id);

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccount(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Video files must be under 500MB",
          variant: "destructive",
        });
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file for thumbnail",
          variant: "destructive",
        });
        return;
      }
      setThumbnailFile(file);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !selectedAccount || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a video file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload video file
      const videoFileName = `${user?.id}/${Date.now()}-${videoFile.name}`;
      setUploadProgress(25);
      
      await uploadFile(videoFile, 'videos', videoFileName);
      setUploadProgress(50);

      // Upload thumbnail if provided
      let thumbnailPath = null;
      if (thumbnailFile) {
        const thumbnailFileName = `${Date.now()}-${thumbnailFile.name}`;
        await uploadFile(thumbnailFile, 'thumbnails', thumbnailFileName);
        thumbnailPath = thumbnailFileName;
      }
      setUploadProgress(75);

      // Create video record
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          title: title.trim(),
          description: description.trim(),
          file_path: videoFileName,
          thumbnail_path: thumbnailPath,
          account_id: selectedAccount,
          uploaded_by: user?.id,
          status: 'pending'
        });

      if (dbError) throw dbError;
      
      setUploadProgress(100);

      toast({
        title: "Success",
        description: "Video uploaded successfully and is pending review",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="account">Account</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter video title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter video description"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video">Video File *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="video"
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <FileVideo className="h-4 w-4" />
            Choose Video File
          </Button>
          {videoFile && (
            <span className="text-sm text-muted-foreground">
              {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
        <div className="flex items-center gap-4">
          <Input
            id="thumbnail"
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            ref={thumbnailInputRef}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => thumbnailInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Choose Thumbnail
          </Button>
          {thumbnailFile && (
            <span className="text-sm text-muted-foreground">
              {thumbnailFile.name}
            </span>
          )}
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Label>Upload Progress</Label>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            {uploadProgress}% complete
          </p>
        </div>
      )}

      <Button type="submit" disabled={uploading} className="w-full">
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </form>
  );
}