import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { VideoUpload } from '@/components/VideoUpload';
import { VideoList } from '@/components/VideoList';
import { AccountManagement } from '@/components/AccountManagement';
import { AdminPanel } from '@/components/AdminPanel';
import { YouTubeVideos } from '@/components/YouTubeVideos';
import { Upload, Video, Users, Settings, LogOut, Youtube } from 'lucide-react';
import api from '@/lib/api';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    try {
      // Get user's accounts and roles - add timestamp to prevent caching
      const accountsResponse = await api.get(`/accounts?t=${Date.now()}`);
      let userAccounts = accountsResponse.data;
      
      // Ensure userAccounts is always an array
      if (!Array.isArray(userAccounts)) {
        console.warn('API returned non-array data:', userAccounts);
        userAccounts = [];
      }
      
      setAccounts(userAccounts);
      
      // Determine user role based on accounts
      console.log('🔍 Dashboard - Determining user role:', {
        userFromAuth: user,
        userRole: user?.role,
        userAccounts: userAccounts.length,
        accountsWithOwnerRole: userAccounts.filter((acc: any) => acc.userRole === 'owner').length
      });
      
      if (user?.role === 'admin') {
        console.log('👑 Setting role to admin based on user.role');
        setUserRole('admin');
      } else if (userAccounts.length > 0 && userAccounts.some((acc: any) => acc.userRole === 'owner')) {
        console.log('👨‍💼 Setting role to owner based on userRoles');
        setUserRole('owner');
      } else {
        console.log('📝 Setting role to editor (default)');
        setUserRole('editor');
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      // Set empty array as fallback
      setAccounts([]);
      setUserRole('editor');
      
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">VideoHub</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user?.picture && (
                <img 
                  src={user.picture} 
                  alt={user.name || 'User'} 
                  className="w-10 h-10 rounded-full border-2 border-gray-200 shadow-sm"
                />
              )}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{userRole}</Badge>
                  <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue={userRole === 'admin' ? 'admin' : 'upload'} className="w-full">
          <TabsList className={`grid w-full ${userRole === 'admin' ? 'grid-cols-5' : userRole === 'owner' ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            {(userRole === 'owner' || userRole === 'admin') && (
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Uploaded Videos
              </TabsTrigger>
            )}
            {(userRole === 'owner' || userRole === 'admin') && (
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube Videos
              </TabsTrigger>
            )}
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Video</CardTitle>
                <CardDescription>
                  Upload videos for review and publishing to YouTube
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VideoUpload onUploadComplete={fetchUserData} />
              </CardContent>
            </Card>
          </TabsContent>

          {(userRole === 'owner' || userRole === 'admin') && (
            <TabsContent value="videos" className="mt-6">
              <VideoList userRole={userRole} />
            </TabsContent>
          )}

          {(userRole === 'owner' || userRole === 'admin') && (
            <TabsContent value="youtube" className="mt-6">
              <YouTubeVideos userRole={userRole} />
            </TabsContent>
          )}

          <TabsContent value="accounts" className="mt-6">
            <AccountManagement userRole={userRole} />
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="admin" className="mt-6">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
