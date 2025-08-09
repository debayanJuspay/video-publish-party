import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, User, Shield, ArrowLeft, Zap } from 'lucide-react';
import axios from 'axios';

declare global {
  interface Window {
    google: any;
  }
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailLogin, setEmailLogin] = useState({ email: '', password: '' });
  const [isVisible, setIsVisible] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    setIsVisible(true);
    // Load Google OAuth script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.oauth2.initCodeClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        callback: async (response: any) => {
          if (response.code) {
            setLoading(true);
            try {
              const { error } = await signInWithGoogle(response.code);
              if (error) {
                toast({
                  title: "Error",
                  description: error,
                  variant: "destructive",
                });
              } else {
                navigate('/dashboard');
              }
            } catch (err) {
              toast({
                title: "Error",
                description: "Failed to sign in",
                variant: "destructive",
              });
            } finally {
              setLoading(false);
            }
          }
        }
      }).requestCode();
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    
    try {
      const response = await axios.post('/auth/email', emailLogin);
      
      // Store token and user data (using same key as useAuth hook)
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Set axios authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      toast({
        title: "Success",
        description: "Signed in successfully",
      });
      
      navigate('/dashboard');
      window.location.reload(); // Refresh to update auth state
    } catch (error: any) {
      console.error('Email login error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Back to home button */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className={`w-full max-w-md transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Header Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 animate-fade-in">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Secure Authentication</span>
            </div>
            
            {/* VideoHub title */}
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              VideoHub
            </h1>
            <p className="text-gray-300 text-lg">Welcome back</p>
          </div>

          {/* Auth Card */}
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-white">Sign In</CardTitle>
              <CardDescription className="text-gray-300">
                Access your video content management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="google" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                  <TabsTrigger 
                    value="google" 
                    className="flex items-center gap-2 data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                  >
                    <Shield className="h-4 w-4" />
                    Admin / Owner
                  </TabsTrigger>
                  <TabsTrigger 
                    value="email" 
                    className="flex items-center gap-2 data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                  >
                    <User className="h-4 w-4" />
                    Editor
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="google" className="space-y-4 mt-6">
                  <div className="text-center text-sm text-gray-300 mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                    <Shield className="h-5 w-5 mx-auto mb-2 text-purple-400" />
                    Admin and account owners sign in with Google
                  </div>
                  <Button 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 h-12 text-base font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                  </Button>
                  
                  {loading && (
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce animation-delay-200"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce animation-delay-400"></div>
                      </div>
                      <p className="text-sm text-blue-300 mt-2">
                        Please complete the sign-in process in the popup window
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="email" className="space-y-4 mt-6">
                  <div className="text-center text-sm text-gray-300 mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                    <User className="h-5 w-5 mx-auto mb-2 text-blue-400" />
                    Editors sign in with email and password
                  </div>
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={emailLogin.email}
                        onChange={(e) => setEmailLogin({ ...emailLogin, email: e.target.value })}
                        required
                        disabled={emailLoading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white font-medium">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={emailLogin.password}
                        onChange={(e) => setEmailLogin({ ...emailLogin, password: e.target.value })}
                        required
                        disabled={emailLoading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 transition-all duration-300"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={emailLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold h-12 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {emailLoading ? 'Signing in...' : 'Sign in with Email'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}