import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (code: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('auth_token');
    console.log('Checking stored token:', storedToken ? 'Found' : 'Not found');
    
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      console.log('No stored token, setting loading to false');
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      console.log('⏱️ Starting profile fetch...');
      const startTime = Date.now();
      
      const response = await api.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      const endTime = Date.now();
      console.log(`✅ Profile fetched in ${endTime - startTime}ms:`, response.data);
      setUser(response.data);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error.response?.data || error.message);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (code: string) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/google', { code });
      
      const { token: authToken, user: userData } = response.data;
      
      // Store token and user data
      localStorage.setItem('auth_token', authToken);
      setToken(authToken);
      setUser(userData);
      
      // Set axios authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      return { error: null };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { 
        error: error.response?.data?.error || 'Authentication failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      // Clear stored data
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      
      // Clear axios authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('✅ Logout completed successfully');
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: 'Sign out failed' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signOut,
      token
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}