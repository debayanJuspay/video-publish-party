import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AccountSkeleton } from '@/components/SkeletonLoaders';
import { Plus, Users, Trash2, Shield } from 'lucide-react';
import axios from 'axios';

interface AccountManagementProps {
  userRole: string | null;
}

export function AccountManagement({ userRole }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newChannelId, setNewChannelId] = useState('');
  const [newEditorEmail, setNewEditorEmail] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Only fetch accounts if user is authenticated
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchEditors(selectedAccountId);
    }
  }, [selectedAccountId]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/accounts');
      const userAccounts = response.data || [];
      
      setAccounts(userAccounts);
      if (userAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(userAccounts[0]._id);
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEditors = async (accountId: string) => {
    try {
      const response = await axios.get(`/accounts/${accountId}/editors`);
      setEditors(response.data || []);
    } catch (error: any) {
      console.error('Error fetching editors:', error);
      toast({
        title: "Error",
        description: "Failed to load editors",
        variant: "destructive",
      });
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAccountName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account name",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.post('/accounts', {
        name: newAccountName.trim(),
        youtubeChannelId: newChannelId.trim() || null
      });

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      setNewAccountName('');
      setNewChannelId('');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const addEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEditorEmail.trim() || !selectedAccountId) {
      toast({
        title: "Error",
        description: "Please enter an email and select an account",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.post(`/accounts/${selectedAccountId}/editors`, {
        email: newEditorEmail.trim()
      });

      toast({
        title: "Success",
        description: "Editor added successfully",
      });

      setNewEditorEmail('');
      fetchEditors(selectedAccountId);
    } catch (error: any) {
      console.error('Error adding editor:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add editor",
        variant: "destructive",
      });
    }
  };

  const removeEditor = async (editorId: string) => {
    if (!selectedAccountId) return;

    try {
      await axios.delete(`/accounts/${selectedAccountId}/editors/${editorId}`);

      toast({
        title: "Success",
        description: "Editor removed successfully",
      });

      fetchEditors(selectedAccountId);
    } catch (error: any) {
      console.error('Error removing editor:', error);
      toast({
        title: "Error",
        description: "Failed to remove editor",
        variant: "destructive",
      });
    }
  };

  const authorizeYouTube = async (accountId: string) => {
    try {
      const response = await axios.get(`/youtube/auth-url/${accountId}`);
      const authUrl = response.data.authUrl;
      
      // Open Google OAuth in popup window
      const popup = window.open(
        authUrl, 
        'youtube-auth', 
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "YouTube Authorization",
        description: "Complete the authorization in the popup window. It will close automatically when done.",
      });
      
      // Listen for message from popup callback
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'YOUTUBE_AUTH_SUCCESS' && event.data.accountId === accountId) {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
          
          toast({
            title: "Success!",
            description: "YouTube account authorized! Videos can now be published.",
          });
          
          fetchAccounts();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Check if popup was closed without authorization
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          // Only show error if we didn't receive success message
          setTimeout(() => {
            if (!popup.closed) return; // Double check
            toast({
              title: "Authorization Cancelled",
              description: "YouTube authorization was cancelled or failed.",
              variant: "destructive",
            });
          }, 1000);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('YouTube authorization error:', error);
      toast({
        title: "Error",
        description: "Failed to start YouTube authorization",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <AccountSkeleton />;
  }

  const selectedAccount = accounts.find(acc => acc._id === selectedAccountId);
  const isOwner = selectedAccount?.userRole === 'owner';

  return (
    <div className="space-y-8">
      {/* Create New Account */}
      {(userRole === 'admin' || userRole === 'owner') && (
        <div className="glass-card p-8 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              Create YouTube Account
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Add a new YouTube account to manage videos and channels
            </p>
          </div>
          
          <form onSubmit={createAccount} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="accountName" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Account Name
                </Label>
                <Input
                  id="accountName"
                  type="text"
                  placeholder="Enter account name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="glass-input h-12 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channelId" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  YouTube Channel ID (Optional)
                </Label>
                <Input
                  id="channelId"
                  type="text"
                  placeholder="Enter YouTube channel ID"
                  value={newChannelId}
                  onChange={(e) => setNewChannelId(e.target.value)}
                  className="glass-input h-12 text-base"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Account
            </Button>
          </form>
        </div>
      )}

      {/* Account List */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            Your Accounts
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your YouTube accounts and permissions
          </p>
        </div>
        
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
              <Users className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No accounts found</h3>
            <p className="text-gray-600 dark:text-gray-300">Create your first account to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account._id}
                className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedAccountId === account._id
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white/50 dark:bg-gray-800/50'
                }`}
                onClick={() => setSelectedAccountId(account._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{account.name}</h3>
                      {account.youtubeChannelId && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Channel ID: {account.youtubeChannelId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={account.userRole === 'owner' ? 'default' : 'secondary'}
                      className={`${
                        account.userRole === 'owner' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      } px-3 py-1 font-medium`}
                    >
                      {account.userRole}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* YouTube Authorization */}
      {selectedAccount && isOwner && (
        <div className="glass-card p-8 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              YouTube Authorization
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Authorize YouTube upload permissions for "{selectedAccount.name}"
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedAccount.youtubeAccessToken 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}>
                  {selectedAccount.youtubeAccessToken ? (
                    <span className="text-2xl">✅</span>
                  ) : (
                    <span className="text-2xl">❌</span>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">YouTube Upload Access</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedAccount.youtubeAccessToken 
                      ? "Authorized - Videos can be published to YouTube"
                      : "Not authorized - Videos will remain pending"
                    }
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => authorizeYouTube(selectedAccount._id)}
                className={`h-12 px-6 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedAccount.youtubeAccessToken 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                }`}
              >
                {selectedAccount.youtubeAccessToken ? "Re-authorize" : "Authorize YouTube"}
              </Button>
            </div>
            
            {!selectedAccount.youtubeAccessToken && (
              <div className="p-6 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Authorization is required to publish videos directly to YouTube. Without authorization, 
                    uploaded videos will remain in pending status.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Management */}
      {selectedAccount && isOwner && (
        <div className="glass-card p-8 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              Manage Editors
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Add or remove editors for "{selectedAccount.name}"
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Add Editor Form */}
            <form onSubmit={addEditor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editorEmail" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Editor Email Address
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="editorEmail"
                    type="email"
                    placeholder="Enter editor's email address"
                    value={newEditorEmail}
                    onChange={(e) => setNewEditorEmail(e.target.value)}
                    className="flex-1 glass-input h-12 text-base"
                    required
                  />
                  <Button 
                    type="submit"
                    className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Editor
                  </Button>
                </div>
              </div>
            </form>

            {/* Editors List */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Editors</h4>
              {editors.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center">
                    <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">No editors added yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add editors to collaborate on video management</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editors.map((editor) => (
                    <div
                      key={editor.id}
                      className="group p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {editor.picture ? (
                            <img
                              src={editor.picture}
                              alt={editor.name}
                              className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                              <Users className="h-6 w-6 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{editor.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{editor.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeEditor(editor.id)}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
