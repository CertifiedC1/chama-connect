import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Wallet, TrendingUp, DollarSign, FileText, Calculator, CreditCard, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ContributionManagement } from '@/components/contributions/ContributionManagement';
import { MakeContribution } from '@/components/contributions/MakeContribution';
import { RecordManualPayment } from '@/components/contributions/RecordManualPayment';
import { ImageSlideshow } from '@/components/layout/ImageSlideshow';
import { RotatingImages } from '@/components/layout/RotatingImages';

interface TreasurerDashboardProps {
  isFirstLogin?: boolean;
  userName?: string;
}

interface Stats {
  totalMembers: number;
  totalContributions: number;
  monthlyContributions: number;
  pendingContributions: number;
  totalLoans: number;
  pendingLoans: number;
}

export function TreasurerDashboard({ isFirstLogin, userName }: TreasurerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'make-contribution' | 'record-payment'>('overview');
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalContributions: 0,
    monthlyContributions: 0,
    pendingContributions: 0,
    totalLoans: 0,
    pendingLoans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('id');
      if (profiles) {
        setStats(prev => ({ ...prev, totalMembers: profiles.length }));
      }

      const { data: contributions } = await supabase.from('contributions').select('amount, status, created_at');
      if (contributions) {
        const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthly = contributions
          .filter(c => new Date(c.created_at) >= monthStart)
          .reduce((sum, c) => sum + Number(c.amount), 0);
        const pending = contributions.filter(c => c.status === 'pending').length;
        
        setStats(prev => ({
          ...prev,
          totalContributions: total,
          monthlyContributions: monthly,
          pendingContributions: pending,
        }));
      }

      const { data: loans } = await supabase.from('loans').select('id, status');
      if (loans) {
        setStats(prev => ({
          ...prev,
          totalLoans: loans.length,
          pendingLoans: loans.filter(l => l.status === 'pending').length,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <MakeContribution onSuccess={() => { fetchStats(); setActiveTab('overview'); }} />
      </div>
    );
  }

  if (activeTab === 'record-payment') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
          ← Back to Dashboard
        </Button>
        <RecordManualPayment onSuccess={() => { fetchStats(); setActiveTab('overview'); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isFirstLogin ? 'Welcome' : 'Welcome back'}, {userName || 'Treasurer'}!
          </h2>
          <p className="text-muted-foreground">Manage Chama finances and contributions</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full">
          <Calculator className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-500">Treasurer</span>
        </div>
      </div>

      <ImageSlideshow />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalContributions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.monthlyContributions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Loans</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLoans}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Actions</CardTitle>
          <CardDescription>Manage contributions and reports</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('contributions')}
          >
            <Wallet className="h-5 w-5" />
            <span>Manage Contributions</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('make-contribution')}
          >
            <CreditCard className="h-5 w-5" />
            <span>Make Contribution</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('record-payment')}
          >
            <Plus className="h-5 w-5" />
            <span>Record Manual Payment</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2" disabled>
            <FileText className="h-5 w-5" />
            <span>Generate Report</span>
          </Button>
        </CardContent>
      </Card>

      <RotatingImages />
    </div>
  );
}
