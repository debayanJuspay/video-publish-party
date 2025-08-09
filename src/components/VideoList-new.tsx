import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Video, Calendar, User, ExternalLink, Check, X } from 'lucide-react';
import axios from 'axios';

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
      // Get user's accounts first
      const accountsResponse = await axios.get('/accounts');
      const userAccounts = accountsResponse.data;
      
      if (userAccounts.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Get videos for these accounts
      const accountIds = userAccounts.map((acc: any) => acc._id);
      const videosResponse = await axios.get('/videos', {
        params: { accountIds: accountIds.join(',') }
      });
      
      setVideos(videosResponse.data || []);
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

  const handleApprove = async (videoId: string) => {
    try {
      await axios.patch(`/videos/${videoId}/status`, {
        status: 'approved',
        adminNotes: 'Video approved for publishing'
      });
      
      toast({
        title: "Success",
        description: "Video approved and will be published to YouTube",
      });
      
      fetchVideos();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve video",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (videoId: string) => {
    try {
      await axios.patch(`/videos/${videoId}/status`, {
        status: 'rejected',
        adminNotes: 'Video rejected by moderator'
      });
      
      toast({
        title: "Success",
        description: "Video rejected",
      });
      
      fetchVideos();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject video",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
        <Badge variant="outline">{videos.length} video{videos.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="grid gap-4">
        {videos.map((video) => (
          <Card key={video._id} className="overflow-hidden">
            <div className="md:flex">
              {video.thumbnailUrl && (
                <div className="md:w-48 h-32 md:h-auto">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                    {video.description && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(video.createdAt)}
                      </div>
                      {video.duration && (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Uploaded by {video.uploadedBy === user?.id ? 'You' : 'Editor'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(video.status)}>
                        {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                      </Badge>
                      
                      {video.youtubeVideoId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://youtube.com/watch?v=${video.youtubeVideoId}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View on YouTube
                        </Button>
                      )}
                    </div>
                  </div>

                  {(userRole === 'admin' || userRole === 'owner') && video.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(video._id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(video._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {video.adminNotes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Admin Notes:</p>
                    <p className="text-sm text-muted-foreground">{video.adminNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
