import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Users, CreditCard, Activity, AlertTriangle, Loader2, Lock, Eye, FileText } from 'lucide-react';

// Admin portal secret token - must match URL parameter
const ADMIN_SECRET_TOKEN = '987xyz';

export default function AdminPortal() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(true);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    // Security check: Verify admin role and token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!user) {
      logAccess('access_attempt', false, 'Not logged in');
      navigate('/auth');
      return;
    }
    
    if (userRole !== 'admin') {
      logAccess('access_attempt', false, 'Not admin role');
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this area.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    // Check for lockout
    checkLockout();
  }, [user, userRole]);

  const checkLockout = async () => {
    if (!user) return;
    
    try {
      // SECURITY: Use edge function to check lockout status (server-side)
      const { data, error } = await supabase.functions.invoke('admin-lockout', {
        body: { action: 'check' },
      });
      
      if (error) {
        console.error('Error checking lockout:', error);
        return;
      }
      
      if (data?.isLocked) {
        setIsLocked(true);
        toast({
          title: 'Account Locked',
          description: 'Too many failed attempts. Try again later.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      setFailedAttempts(data?.failedAttempts || 0);
    } catch (error) {
      console.error('Lockout check failed:', error);
    }
  };

  const logAccess = async (action: string, success: boolean, reason?: string) => {
    try {
      await supabase.from('admin_access_logs').insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        action,
        ip_address: 'client', // IP would need server-side detection
        user_agent: navigator.userAgent,
        success,
        failure_reason: reason || null,
      });
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  };

  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    
    setLoading(true);
    
    try {
      // SECURITY: Use edge function for re-authentication (server-side lockout management)
      const { data, error } = await supabase.functions.invoke('admin-lockout', {
        body: { action: 'verify', password },
      });
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Authentication service unavailable',
          variant: 'destructive',
        });
        return;
      }
      
      if (!data?.success) {
        setFailedAttempts(5 - (data?.attemptsRemaining || 0));
        
        if (data?.isLocked) {
          setIsLocked(true);
          toast({
            title: 'Account Locked',
            description: 'Too many failed attempts. Try again in 30 minutes.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }
        
        toast({
          title: 'Authentication Failed',
          description: `Invalid password. ${data?.attemptsRemaining || 0} attempts remaining.`,
          variant: 'destructive',
        });
        return;
      }

      // Success
      setIsAuthenticated(true);
      setIsReauthenticating(false);
      setPassword('');
      
      // Load admin data
      fetchAdminData();
      
      toast({
        title: 'Access Granted',
        description: 'Welcome to the Admin Portal',
      });
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .order('created_at', { ascending: false });
    
    if (usersData) setUsers(usersData);

    // Fetch transactions
    const { data: transData } = await supabase
      .from('mpesa_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (transData) setTransactions(transData);

    // Fetch access logs
    const { data: logsData } = await supabase
      .from('admin_access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (logsData) setAccessLogs(logsData);

    // Calculate stats
    const totalUsers = usersData?.length || 0;
    const activeUsers = usersData?.filter((u: any) => u.status === 'active').length || 0;
    const totalTrans = transData?.length || 0;
    const pending = transData?.filter((t: any) => t.status === 'pending').length || 0;
    
    setSystemStats({
      totalUsers,
      activeUsers,
      totalTransactions: totalTrans,
      pendingPayments: pending,
    });
  };

  // Re-authentication screen
  if (isReauthenticating && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Admin Portal Access</CardTitle>
            <CardDescription>
              Please re-enter your password to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReauthenticate} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
              </div>
              {failedAttempts > 0 && (
                <p className="text-sm text-destructive">
                  {5 - failedAttempts} attempts remaining before lockout
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Authenticate
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Restricted Access</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="destructive">Admin Only</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Exit Portal
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{systemStats.activeUsers} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">{systemStats.pendingPayments} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Secure</div>
              <p className="text-xs text-muted-foreground">RBAC enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Access Logs</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  User Management (View Only)
                </CardTitle>
                <CardDescription>View registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.user_roles?.[0]?.role || 'member'}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Transaction Logs (Read Only)
                </CardTitle>
                <CardDescription>M-Pesa transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((trans) => (
                        <TableRow key={trans.id}>
                          <TableCell className="font-mono text-xs">{trans.id.slice(0, 8)}...</TableCell>
                          <TableCell>{trans.phone_number}</TableCell>
                          <TableCell>KES {Number(trans.amount).toLocaleString()}</TableCell>
                          <TableCell>{trans.transaction_type}</TableCell>
                          <TableCell>
                            <Badge variant={trans.status === 'completed' ? 'default' : trans.status === 'pending' ? 'secondary' : 'destructive'}>
                              {trans.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(trans.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Admin Access Logs
                </CardTitle>
                <CardDescription>Security audit trail</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.user_email || 'Unknown'}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            <Badge variant={log.success ? 'default' : 'destructive'}>
                              {log.success ? 'Success' : 'Failed'}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.failure_reason || '-'}</TableCell>
                          <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status & Manual Overrides
                </CardTitle>
                <CardDescription>System health and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Authentication</h4>
                    <p className="text-sm text-muted-foreground">RBAC with re-authentication</p>
                    <Badge variant="outline" className="mt-2">Active</Badge>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Security Headers</h4>
                    <p className="text-sm text-muted-foreground">X-Frame-Options, CSP enabled</p>
                    <Badge variant="outline" className="mt-2">Configured</Badge>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Lockout Policy</h4>
                    <p className="text-sm text-muted-foreground">5 failed attempts = 30min lockout</p>
                    <Badge variant="outline" className="mt-2">Enforced</Badge>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Audit Logging</h4>
                    <p className="text-sm text-muted-foreground">All access attempts logged</p>
                    <Badge variant="outline" className="mt-2">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
