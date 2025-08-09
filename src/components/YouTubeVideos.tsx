import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Eye, ThumbsUp, MessageCircle, Calendar, Video, Users } from 'lucide-react';
import axios from 'axios';

interface YouTubeVideosProps {
  userRole: string | null;
}

export function YouTubeVideos({ userRole }: YouTubeVideosProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  useEffect(() => {
    if (selectedAccount?.youtubeChannelId) {
      fetchChannelInfo(selectedAccount.youtubeChannelId);
      fetchYouTubeVideos(selectedAccount.youtubeChannelId);
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/accounts/youtube-accessible');
      const userAccounts = response.data || [];
      
      setAccounts(userAccounts);
      
      if (userAccounts.length > 0) {
        setSelectedAccount(userAccounts[0]);
      }
    } catch (error: any) {
      console.error('Error fetching YouTube accessible accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load YouTube accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelInfo = async (channelId: string) => {
    try {
      const response = await axios.get(`/youtube/channel/${channelId}`);
      setChannelInfo(response.data);
    } catch (error: any) {
      console.error('Error fetching channel info:', error);
      setChannelInfo(null);
    }
  };

  const fetchYouTubeVideos = async (channelId: string) => {
    setVideosLoading(true);
    try {
      const response = await axios.get(`/youtube/videos/${channelId}?maxResults=20`);
      setVideos(response.data || []);
    } catch (error: any) {
      console.error('Error fetching YouTube videos:', error);
      toast({
        title: "Error",
        description: "Failed to load YouTube videos. Make sure the channel ID is correct.",
        variant: "destructive",
      });
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const parseDuration = (duration: string) => {
    // Parse ISO 8601 duration format (PT4M13S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading YouTube data...</div>;
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No YouTube Accounts</h3>
          <p className="text-muted-foreground">
            {userRole === 'admin' 
              ? "You need to authorize YouTube access for at least one account to view YouTube videos. Go to the Accounts tab to connect your YouTube channel."
              : "You need to be assigned to an account with a configured YouTube channel to view this tab."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Selector */}
      {accounts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select YouTube Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {accounts.map((account) => (
                <Button
                  key={account._id}
                  variant={selectedAccount?._id === account._id ? "default" : "outline"}
                  onClick={() => setSelectedAccount(account)}
                  className="justify-start"
                >
                  {account.name}
                  {account.youtubeChannelId && (
                    <Badge variant="secondary" className="ml-2">
                      Connected
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAccount && (
        <>
          {/* Channel Info */}
          {channelInfo && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {channelInfo.thumbnail && (
                    <img
                      src={channelInfo.thumbnail}
                      alt={channelInfo.title}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{channelInfo.title}</h2>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {channelInfo.description}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {formatNumber(channelInfo.subscriberCount)} subscribers
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="h-4 w-4" />
                        {formatNumber(channelInfo.videoCount)} videos
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {formatNumber(channelInfo.viewCount)} views
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://youtube.com/channel/${selectedAccount.youtubeChannelId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Channel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Videos List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent YouTube Videos</CardTitle>
              <CardDescription>
                Videos published on this YouTube channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videosLoading ? (
                <div className="text-center py-8">Loading videos...</div>
              ) : videos.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No videos found</h3>
                  <p className="text-muted-foreground">
                    {selectedAccount.youtubeChannelId 
                      ? "This channel doesn't have any public videos yet." 
                      : "Please add a YouTube Channel ID to this account to view videos."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="md:flex">
                        <div className="md:w-48 h-32 md:h-auto relative">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                            {parseDuration(video.duration)}
                          </div>
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>
                              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                {video.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(video.publishedAt)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  {formatNumber(video.viewCount)} views
                                </div>
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="h-4 w-4" />
                                  {formatNumber(video.likeCount)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-4 w-4" />
                                  {formatNumber(video.commentCount)}
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(video.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Watch on YouTube
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
