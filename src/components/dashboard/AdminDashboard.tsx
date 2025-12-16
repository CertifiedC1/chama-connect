import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Wallet, TrendingUp, AlertCircle, Settings, Shield, CreditCard, FileText, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberManagement } from '@/components/members/MemberManagement';
import { ContributionManagement } from '@/components/contributions/ContributionManagement';
import { MakeContribution } from '@/components/contributions/MakeContribution';
import { LoanManagement } from '@/components/loans/LoanManagement';
import { FinesManagement } from '@/components/fines/FinesManagement';
import { SystemSettings } from '@/components/settings/SystemSettings';
import { ImageSlideshow } from '@/components/layout/ImageSlideshow';
import { RotatingImages } from '@/components/layout/RotatingImages';

interface AdminDashboardProps {
  isFirstLogin?: boolean;
  userName?: string;
}

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalContributions: number;
  pendingContributions: number;
  totalLoansIssued: number;
  pendingLoanRequests: number;
  totalFines: number;
}

type TabType = 'overview' | 'members' | 'contributions' | 'make-contribution' | 'loans' | 'fines' | 'settings';

export function AdminDashboard({ isFirstLogin = false, userName }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    totalContributions: 0,
    pendingContributions: 0,
    totalLoansIssued: 0,
    pendingLoanRequests: 0,
    totalFines: 0,
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
        const total = contributions
          .filter(c => c.status === 'completed')
          .reduce((sum, c) => sum + Number(c.amount), 0);
        const pending = contributions.filter(c => c.status === 'pending').length;
        setStats(prev => ({
          ...prev,
          totalContributions: total,
          pendingContributions: pending,
        }));
      }

      // Fetch loan stats
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('total_amount, status');
      
      if (!loansError && loans) {
        const totalIssued = loans
          .filter(l => l.status === 'approved')
          .reduce((sum, l) => sum + Number(l.total_amount), 0);
        const pending = loans.filter(l => l.status === 'pending').length;
        setStats(prev => ({
          ...prev,
          totalLoansIssued: totalIssued,
          pendingLoanRequests: pending,
        }));
      }

      // Fetch fines stats
      const { data: fines, error: finesError } = await supabase
        .from('fines')
        .select('amount, status');
      
      if (!finesError && fines) {
        const totalUnpaid = fines
          .filter(f => f.status === 'unpaid')
          .reduce((sum, f) => sum + Number(f.amount), 0);
        setStats(prev => ({
          ...prev,
          totalFines: totalUnpaid,
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
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <MemberManagement />
      </div>
    );
  }

  if (activeTab === 'contributions') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <ContributionManagement />
      </div>
    );
  }

  if (activeTab === 'make-contribution') {
    return (
      <div 
        className="min-h-[60vh] flex items-center justify-center bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&h=1080&fit=crop)',
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-4xl px-4">
          <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
            ← Back to Dashboard
          </Button>
          <MakeContribution onSuccess={() => { fetchStats(); setActiveTab('overview'); }} />
        </div>
      </div>
    );
  }

  if (activeTab === 'loans') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <LoanManagement />
      </div>
    );
  }

  if (activeTab === 'fines') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <FinesManagement />
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <SystemSettings />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            {isFirstLogin ? 'Welcome' : 'Welcome back'}, {userName || 'Admin'}! Full system access and management
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Admin</span>
        </div>
      </div>

      {/* Image Slideshow */}
      <ImageSlideshow />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeMembers} active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Contributions</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalContributions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingContributions}</div>
            <p className="text-xs text-muted-foreground">Contributions to approve</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
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

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans Issued</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalLoansIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Approved loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Loan Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLoanRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Fines</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">KES {stats.totalFines.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outstanding fines</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Admin management tools</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('members')}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Manage Members</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('contributions')}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">View Contributions</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('make-contribution')}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Make Contribution</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('loans')}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-xs">Manage Loans</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('fines')}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs">Manage Fines</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">System Settings</span>
          </Button>
        </CardContent>
      </Card>

      {/* Rotating Images */}
      <RotatingImages />
    </div>
  );
}
