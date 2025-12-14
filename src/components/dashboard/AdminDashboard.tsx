import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Wallet, TrendingUp, AlertCircle, UserPlus, Settings, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberManagement } from '@/components/members/MemberManagement';
import { ContributionManagement } from '@/components/contributions/ContributionManagement';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalContributions: number;
  pendingContributions: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'contributions'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    totalContributions: 0,
    pendingContributions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch member stats
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('status');
      
      if (!profilesError && profiles) {
        setStats(prev => ({
          ...prev,
          totalMembers: profiles.length,
          activeMembers: profiles.filter(p => p.status === 'active').length,
        }));
      }

      // Fetch contribution stats
      const { data: contributions, error: contribError } = await supabase
        .from('contributions')
        .select('amount, status');
      
      if (!contribError && contributions) {
        const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        const pending = contributions.filter(c => c.status === 'pending').length;
        setStats(prev => ({
          ...prev,
          totalContributions: total,
          pendingContributions: pending,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (activeTab === 'members') {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('overview')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <MemberManagement />
      </div>
    );
  }

  if (activeTab === 'contributions') {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('overview')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <ContributionManagement />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">Full system access and management</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Admin</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeMembers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalContributions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingContributions}</div>
            <p className="text-xs text-muted-foreground">Contributions to approve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Admin management tools</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('members')}
          >
            <Users className="h-5 w-5" />
            <span>Manage Members</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('contributions')}
          >
            <Wallet className="h-5 w-5" />
            <span>View Contributions</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2" disabled>
            <Settings className="h-5 w-5" />
            <span>System Settings</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}