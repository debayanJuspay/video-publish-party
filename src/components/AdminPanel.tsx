import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Upload, Eye, Calendar, User } from 'lucide-react';

export function AdminPanel() {
  const [pendingVideos, setPendingVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingVideos();
  }, []);

  const fetchPendingVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          accounts(name),
          profiles!videos_uploaded_by_fkey(full_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingVideos(data || []);
    } catch (error: any) {
      console.error('Error fetching pending videos:', error);
      toast({
        title: "Error",
        description: "Failed to load pending videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateVideoStatus = async (videoId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          status,
          admin_notes: adminNotes[videoId] || '',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Video ${status} successfully`,
      });

      fetchPendingVideos();
      setAdminNotes(prev => ({ ...prev, [videoId]: '' }));
    } catch (error: any) {
      console.error('Error updating video status:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const publishToYouTube = async (videoId: string) => {
    setProcessing(videoId);
    try {
      const { data, error } = await supabase.functions.invoke('publish-to-youtube', {
        body: {
          videoId,
          adminNotes: adminNotes[videoId] || ''
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video published to YouTube successfully",
      });

      fetchPendingVideos();
      setAdminNotes(prev => ({ ...prev, [videoId]: '' }));
    } catch (error: any) {
      console.error('Error publishing to YouTube:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to publish video",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getVideoUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('videos')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    return data?.signedUrl;
  };

  const handlePreviewVideo = async (filePath: string) => {
    const url = await getVideoUrl(filePath);
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending videos...</div>;
  }

  if (pendingVideos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-muted-foreground">No videos pending review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <Badge variant="secondary">
          {pendingVideos.length} pending review
        </Badge>
      </div>

      <div className="grid gap-6">
        {pendingVideos.map((video) => (
          <Card key={video.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{video.title}</CardTitle>
                  <CardDescription>
                    Account: {video.accounts?.name || 'Unknown'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">Pending Review</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {video.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {video.profiles?.full_name || 'Unknown'} ({video.profiles?.email})
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(video.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePreviewVideo(video.file_path)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview Video
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`notes-${video.id}`}>Admin Notes</Label>
                <Textarea
                  id={`notes-${video.id}`}
                  placeholder="Add notes for the editor..."
                  value={adminNotes[video.id] || ''}
                  onChange={(e) => setAdminNotes(prev => ({ ...prev, [video.id]: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => updateVideoStatus(video.id, 'approved')}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                
                <Button
                  onClick={() => updateVideoStatus(video.id, 'rejected')}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>

                <Button
                  onClick={() => publishToYouTube(video.id)}
                  disabled={processing === video.id}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {processing === video.id ? 'Publishing...' : 'Publish to YouTube'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}