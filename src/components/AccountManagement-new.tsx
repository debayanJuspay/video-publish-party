import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Users, Trash2 } from 'lucide-react';
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
    fetchAccounts();
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

  if (loading) {
    return <div className="text-center py-8">Loading accounts...</div>;
  }

  const selectedAccount = accounts.find(acc => acc._id === selectedAccountId);
  const isOwner = selectedAccount?.userRole === 'owner';

  return (
    <div className="space-y-6">
      {/* Create New Account */}
      {(userRole === 'admin' || userRole === 'owner') && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Account</CardTitle>
            <CardDescription>
              Create a new YouTube account for video management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountName">Account Name *</Label>
                  <Input
                    id="accountName"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Enter account name"
                  />
                </div>
                <div>
                  <Label htmlFor="channelId">YouTube Channel ID (Optional)</Label>
                  <Input
                    id="channelId"
                    value={newChannelId}
                    onChange={(e) => setNewChannelId(e.target.value)}
                    placeholder="Enter YouTube channel ID"
                  />
                </div>
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            Manage your YouTube accounts and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No accounts found</h3>
              <p className="text-muted-foreground">Create your first account to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccountId === account._id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedAccountId(account._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{account.name}</h3>
                      {account.youtubeChannelId && (
                        <p className="text-sm text-muted-foreground">
                          Channel ID: {account.youtubeChannelId}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={account.userRole === 'owner' ? 'default' : 'secondary'}>
                        {account.userRole}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Management */}
      {selectedAccount && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Editors</CardTitle>
            <CardDescription>
              Add or remove editors for "{selectedAccount.name}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Editor Form */}
            <form onSubmit={addEditor} className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newEditorEmail}
                  onChange={(e) => setNewEditorEmail(e.target.value)}
                  placeholder="Enter editor's email address"
                  type="email"
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Editor
              </Button>
            </form>

            {/* Editors List */}
            <div>
              <h4 className="font-medium mb-3">Current Editors</h4>
              {editors.length === 0 ? (
                <p className="text-muted-foreground text-sm">No editors added yet.</p>
              ) : (
                <div className="space-y-2">
                  {editors.map((editor) => (
                    <div
                      key={editor.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {editor.picture && (
                          <img
                            src={editor.picture}
                            alt={editor.name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium">{editor.name}</p>
                          <p className="text-sm text-muted-foreground">{editor.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEditor(editor.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
