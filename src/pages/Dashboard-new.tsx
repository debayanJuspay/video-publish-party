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
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { Upload, Video, Users, Settings, LogOut, Sparkles, Crown, User } from 'lucide-react';
import axios from 'axios';

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
    
    console.log('Dashboard user data:', user);
    console.log('User picture:', user?.picture);
    
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    try {
      // Get user's accounts and roles
      const accountsResponse = await axios.get('/accounts');
      const userAccounts = accountsResponse.data;
      
      setAccounts(userAccounts || []);
      
      // Determine user role based on their highest role
      if (user?.role === 'admin' && userAccounts?.some((acc: any) => acc.userRole === 'owner')) {
        // Admin who owns at least one account
        setUserRole('admin');
      } else if (userAccounts?.some((acc: any) => acc.userRole === 'owner')) {
        // User who owns at least one account (but not admin)
        setUserRole('owner');
      } else if (userAccounts?.some((acc: any) => acc.userRole === 'editor')) {
        // User who is an editor on at least one account
        setUserRole('editor');
      } else {
        // Default role for users with no accounts
        setUserRole('user');
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
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
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      navigate('/auth');
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'owner': return Sparkles;
      case 'editor': return User;
      default: return User;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0';
      case 'owner': return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0';
      case 'editor': return 'bg-gradient-to-r from-green-600 to-green-700 text-white border-0';
      default: return 'bg-gray-600 text-white border-0';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  VideoHub
                </h1>
              </div>
              
              {/* User Avatar */}
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name || 'User profile'} 
                  className="w-9 h-9 rounded-full border-2 border-purple-200 shadow-sm hover:shadow-md transition-shadow duration-300"
                  onError={(e) => {
                    console.error('Profile picture failed to load:', user.picture);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-sm font-medium text-white shadow-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <Badge className={`${getRoleBadgeClass(userRole || '')} px-3 py-1 text-xs font-semibold shadow-sm`}>
                  {React.createElement(getRoleIcon(userRole || ''), { className: 'w-3 h-3 mr-1' })}
                  {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                </Badge>
              </div>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                size="sm"
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.name?.split(' ')[0]}! 👋
                </h2>
                <p className="text-gray-600">
                  Manage your video content and collaborate with your team
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{accounts.length}</div>
                  <div className="text-xs text-gray-500">Accounts</div>
                </div>
                <div className="w-px h-12 bg-gray-300"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userRole}</div>
                  <div className="text-xs text-gray-500">Role</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue={userRole === 'admin' ? 'admin' : 'upload'} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/50 backdrop-blur-sm border border-white/50 shadow-lg rounded-xl p-1 mb-8">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 rounded-lg transition-all duration-300"
            >
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="videos" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 rounded-lg transition-all duration-300"
            >
              <Video className="h-4 w-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger 
              value="accounts" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 rounded-lg transition-all duration-300"
            >
              <Users className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger 
                value="admin" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 rounded-lg transition-all duration-300"
              >
                <Settings className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-white/50">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Upload className="h-5 w-5 text-purple-600" />
                  Upload Video
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Upload videos for review and publishing to YouTube
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <VideoUpload onUploadComplete={fetchUserData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-6">
              <VideoList userRole={userRole} />
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="mt-6">
            <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-6">
              <AccountManagement userRole={userRole} />
            </div>
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="admin" className="mt-6">
              <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-6">
                <AdminPanel />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
