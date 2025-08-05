import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Video, Calendar, User, ExternalLink } from 'lucide-react';

interface VideoListProps {
  userRole: string | null;
}

export function VideoList({ userRole }: VideoListProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, [user, userRole]);

  const fetchVideos = async () => {
    try {
      let query = supabase
        .from('videos')
        .select(`
          *,
          accounts(name),
          profiles!videos_uploaded_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show videos from user's accounts
      if (userRole !== 'admin') {
        const { data: userAccounts } = await supabase
          .from('user_roles')
          .select('account_id')
          .eq('user_id', user?.id);
        
        const accountIds = userAccounts?.map(ur => ur.account_id) || [];
        query = query.in('account_id', accountIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setVideos(data || []);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      case 'published': return 'default';
      default: return 'default';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'published': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading videos...</div>;
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No videos found</h3>
          <p className="text-muted-foreground">Upload your first video to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Videos</h2>
        <Button onClick={fetchVideos} variant="outline" size="sm">
          Refresh
        </Button>
      </div>
      
      <div className="grid gap-4">
        {videos.map((video) => (
          <Card key={video.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{video.title}</CardTitle>
                  <CardDescription>
                    Account: {video.accounts?.name || 'Unknown'}
                  </CardDescription>
                </div>
                <Badge variant={getStatusVariant(video.status)}>
                  {video.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {video.description && (
                  <p className="text-sm text-muted-foreground">{video.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {video.profiles?.full_name || 'Unknown'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(video.created_at).toLocaleDateString()}
                  </div>
                </div>

                {video.admin_notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Admin Notes:</p>
                    <p className="text-sm">{video.admin_notes}</p>
                  </div>
                )}

                {video.status === 'published' && video.youtube_video_id && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://youtube.com/watch?v=${video.youtube_video_id}`, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on YouTube
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}