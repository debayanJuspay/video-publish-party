import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { VideoListSkeleton } from '@/components/SkeletonLoaders';
import { Video, Calendar, User, ExternalLink, Check, X, Eye, Play, Clock, FileVideo, MessageSquare } from 'lucide-react';
import axios from 'axios';

interface VideoListProps {
  userRole: string | null;
}

export function VideoList({ userRole }: VideoListProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideo, setPreviewVideo] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Only fetch videos if user is authenticated
    if (user) {
      fetchVideos();
    }
  }, [user, userRole]);

  const fetchVideos = async () => {
    try {
      if (userRole === 'admin') {
        // Admin sees ALL videos from ALL accounts for review
        const videosResponse = await axios.get('/videos');
        setVideos(videosResponse.data || []);
      } else {
        // Regular users see only videos from accounts they have access to
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
      }
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

  const handleApprove = async (videoId: string, notes: string = '') => {
    try {
      await axios.patch(`/videos/${videoId}/status`, {
        status: 'approved',
        adminNotes: notes || 'Video approved for publishing'
      });
      
      toast({
        title: "Success",
        description: "Video approved and will be published to YouTube",
      });
      
      setIsPreviewOpen(false);
      setAdminNotes('');
      fetchVideos();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve video",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (videoId: string, notes: string = '') => {
    try {
      await axios.patch(`/videos/${videoId}/status`, {
        status: 'rejected',
        adminNotes: notes || 'Video rejected by moderator'
      });
      
      toast({
        title: "Success",
        description: "Video rejected",
      });
      
      setIsPreviewOpen(false);
      setAdminNotes('');
      fetchVideos();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject video",
        variant: "destructive",
      });
    }
  };

  const openPreview = (video: any) => {
    setPreviewVideo(video);
    setAdminNotes('');
    setIsPreviewOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'approved': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'rejected': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      case 'published': return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
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
    return <VideoListSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl">
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
            <Video className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No videos found</h3>
          <p className="text-gray-600 dark:text-gray-300">Upload your first video to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <FileVideo className="h-6 w-6 text-white" />
              </div>
              Videos
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {userRole === 'admin' ? 'Review and manage all uploaded videos' : 'Manage your uploaded videos'}
            </p>
          </div>
          <Badge 
            variant="outline"
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none px-4 py-2 text-lg font-medium"
          >
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="space-y-6">
        {videos.map((video) => (
          <div key={video._id} className="glass-card p-6 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
            <div className="md:flex gap-6">
              {/* Thumbnail */}
              {video.thumbnailUrl && (
                <div className="md:w-64 h-36 md:h-auto rounded-xl overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 mt-4 md:mt-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{video.title}</h3>
                    {video.description && (
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1 rounded-lg">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(video.createdAt)}</span>
                  </div>
                  {video.duration && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1 rounded-lg">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1 rounded-lg">
                    <User className="h-4 w-4" />
                    <span>Uploaded by {video.uploadedBy === user?.id ? 'You' : 'Editor'}</span>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(video.status)} px-3 py-1 font-medium`}>
                      {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                    </Badge>
                    
                    {video.status === 'published' && (
                      <>
                        {video.youtubeVideoId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://youtube.com/watch?v=${video.youtubeVideoId}`, '_blank')}
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-none"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on YouTube
                          </Button>
                        ) : (
                          <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-900/20">
                            YouTube Upload Pending
                          </Badge>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Preview button for admins/owners */}
                    {(userRole === 'admin' || userRole === 'owner') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(video)}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    )}
                    
                    {/* Admin action buttons for pending videos */}
                    {(userRole === 'admin' || userRole === 'owner') && video.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(video._id)}
                          className="border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(video._id)}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {video.adminNotes && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageSquare className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Admin Notes:</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{video.adminNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewVideo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Video Preview
                </DialogTitle>
                <DialogDescription>
                  Review this video before making your decision
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full h-full"
                    src={previewVideo.videoUrl}
                    poster={previewVideo.thumbnailUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Video Details */}
                <div className="grid gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                    <h3 className="text-xl font-semibold mt-1">{previewVideo.title}</h3>
                  </div>

                  {previewVideo.description && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                        {previewVideo.description}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Duration</Label>
                      <p className="text-sm font-medium">
                        {previewVideo.duration ? formatDuration(previewVideo.duration) : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Uploaded</Label>
                      <p className="text-sm font-medium">{formatDate(previewVideo.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <Badge className={getStatusColor(previewVideo.status)}>
                        {previewVideo.status.charAt(0).toUpperCase() + previewVideo.status.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Uploaded by</Label>
                      <p className="text-sm font-medium">
                        {previewVideo.uploadedBy === user?.id ? 'You' : 'Editor'}
                      </p>
                    </div>
                  </div>

                  {/* Admin Notes Input */}
                  <div>
                    <Label htmlFor="adminNotes" className="text-sm font-medium">
                      Admin Notes (Optional)
                    </Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add any notes or feedback for this decision..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  {previewVideo.status === 'pending' && (userRole === 'admin' || userRole === 'owner') && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => handleApprove(previewVideo._id, adminNotes)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve & Publish
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(previewVideo._id, adminNotes)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsPreviewOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* For non-pending videos, just show close button */}
                  {previewVideo.status !== 'pending' && (
                    <div className="flex justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsPreviewOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  )}

                  {/* Show existing admin notes if any */}
                  {previewVideo.adminNotes && (
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-sm font-medium">Previous Admin Notes:</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {previewVideo.adminNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
