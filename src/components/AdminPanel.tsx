import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AdminSkeleton } from '@/components/SkeletonLoaders';
import { UserPlus, Users, Mail, User, Trash2, Shield, Crown, Calendar } from 'lucide-react';
import api from '@/lib/api';

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('🔍 AdminPanel: Fetching users...');
      const response = await api.get('/admin/users');
      console.log('🔍 AdminPanel: Server response:', response.data);
      const usersData = response.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEditorAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      await api.post('/admin/create-editor', newUser);
      
      toast({
        title: "Success",
        description: "Editor account created successfully",
      });
      
      setNewUser({ name: '', email: '', password: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating editor:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create editor account",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    console.log('🗑️ Attempting to delete user with ID:', userId);
    
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID is missing",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm('Are you sure you want to remove this editor? This will remove their access to your accounts.')) return;
    
    try {
      console.log('🗑️ Making DELETE request to:', `/admin/users/${userId}`);
      const response = await api.delete(`/admin/users/${userId}`);
      console.log('🗑️ Delete response:', response.data);
      
      toast({
        title: "Success",
        description: "Editor removed successfully",
      });
      
      fetchUsers();
    } catch (error: any) {
      console.error('🗑️ Error removing editor:', error);
      console.error('🗑️ Error response:', error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove editor",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 rounded-2xl">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center animate-pulse">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
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
                <Crown className="h-6 w-6 text-white" />
              </div>
              Admin Panel
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage editor accounts and permissions
            </p>
          </div>
          <Badge 
            variant="secondary"
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 text-lg font-medium"
          >
            <Shield className="h-4 w-4 mr-2" />
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </Badge>
        </div>
      </div>

      {/* Create Editor Account Form */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            Create Editor Account
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Create a new editor account with email and password authentication
          </p>
        </div>
        
        <form onSubmit={createEditorAccount} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="glass-input h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="glass-input h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="glass-input h-12 text-base"
                required
                minLength={6}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={createLoading}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            {createLoading ? 'Creating Account...' : 'Create Editor Account'}
          </Button>
        </form>
      </div>

      {/* Editors List */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            My Editors
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage editors you've created for your YouTube accounts
          </p>
        </div>
        
        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
              <Users className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No editors created yet</h3>
            <p className="text-gray-600 dark:text-gray-300">Use the form above to create editor accounts for collaboration</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div 
                key={user._id || user.id} 
                className="group p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {user.picture ? (
                      <img 
                        src={user.picture} 
                        alt={user.name} 
                        className="w-14 h-14 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <User className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-gray-900 dark:text-white">{user.name}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                      {user.accounts && user.accounts.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          <strong>Access to:</strong> {user.accounts.join(', ')}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <Calendar className="h-3 w-3" />
                        Created: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 font-medium"
                    >
                      Editor
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1"
                    >
                      {user.googleId ? 'Google OAuth' : 'Email/Password'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteUser(user._id || user.googleId || user.id)}
                      title="Remove editor access"
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-none transition-all duration-300 transform hover:scale-105"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}