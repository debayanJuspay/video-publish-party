import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Users, Trash2 } from 'lucide-react';

interface AccountManagementProps {
  userRole: string | null;
}

export function AccountManagement({ userRole }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newEditorEmail, setNewEditorEmail] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    try {
      let query = supabase
        .from('accounts')
        .select(`
          *,
          user_roles(
            id,
            role,
            profiles!user_roles_user_id_fkey(full_name, email)
          )
        `);

      // If not admin, only show accounts user has access to
      if (userRole !== 'admin') {
        const { data: userAccounts } = await supabase
          .from('user_roles')
          .select('account_id')
          .eq('user_id', user?.id);
        
        const accountIds = userAccounts?.map(ur => ur.account_id) || [];
        query = query.in('id', accountIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccountId(data[0].id);
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

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    try {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: newAccountName.trim(),
          owner_id: user?.id
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Add user as account owner
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user?.id,
          account_id: account.id,
          role: 'account_owner'
        });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      setNewAccountName('');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditorEmail.trim() || !selectedAccountId) return;

    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newEditorEmail.trim())
        .single();

      if (profileError || !profiles) {
        toast({
          title: "User not found",
          description: "No user found with this email address",
          variant: "destructive",
        });
        return;
      }

      // Add user as editor
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: profiles.id,
          account_id: selectedAccountId,
          role: 'editor'
        });

      if (roleError) {
        if (roleError.code === '23505') { // Unique constraint violation
          toast({
            title: "User already added",
            description: "This user is already part of this account",
            variant: "destructive",
          });
        } else {
          throw roleError;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Editor added successfully",
      });

      setNewEditorEmail('');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error adding editor:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeUserRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed successfully",
      });

      fetchAccounts();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {(userRole === 'admin' || userRole === 'account_owner') && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Account</CardTitle>
            <CardDescription>
              Create a new account to manage videos and editors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAccount} className="flex gap-4">
              <Input
                placeholder="Account name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {account.name}
                <Badge variant="outline">
                  {account.user_roles?.length || 0} members
                </Badge>
              </CardTitle>
              <CardDescription>
                Created: {new Date(account.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Editor Form */}
              {(userRole === 'admin' || userRole === 'account_owner') && (
                <form onSubmit={addEditor} className="flex gap-4">
                  <Input
                    placeholder="Editor email"
                    type="email"
                    value={newEditorEmail}
                    onChange={(e) => setNewEditorEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    variant="outline"
                    onClick={() => setSelectedAccountId(account.id)}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Add Editor
                  </Button>
                </form>
              )}

              {/* Users List */}
              <div className="space-y-2">
                <Label>Team Members</Label>
                {account.user_roles?.map((userRole: any) => (
                  <div key={userRole.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{userRole.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{userRole.profiles?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={userRole.role === 'account_owner' ? 'default' : 'secondary'}>
                        {userRole.role}
                      </Badge>
                      {userRole.role !== 'account_owner' && (userRole === 'admin' || userRole === 'account_owner') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeUserRole(userRole.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}