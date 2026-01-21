import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Wallet, TrendingUp, DollarSign, FileText, Calculator, CreditCard, Plus, AlertTriangle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ContributionManagement } from '@/components/contributions/ContributionManagement';
import { MakeContribution } from '@/components/contributions/MakeContribution';
import { RecordManualPayment } from '@/components/contributions/RecordManualPayment';
import { LoanManagement } from '@/components/loans/LoanManagement';
import { FinesManagement } from '@/components/fines/FinesManagement';
import { ImageSlideshow } from '@/components/layout/ImageSlideshow';
import { RotatingImages } from '@/components/layout/RotatingImages';
import { useToast } from '@/hooks/use-toast';
import { DashboardStatsSkeleton, QuickActionsSkeleton } from '@/components/dashboard/DashboardStatsSkeleton';

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

type TabType = 'overview' | 'contributions' | 'make-contribution' | 'record-payment' | 'loans' | 'fines';

export function TreasurerDashboard({ isFirstLogin, userName }: TreasurerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalContributions: 0,
    monthlyContributions: 0,
    pendingContributions: 0,
    totalLoans: 0,
    pendingLoans: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        const total = contributions.filter(c => c.status === 'completed').reduce((sum, c) => sum + Number(c.amount), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthly = contributions
          .filter(c => new Date(c.created_at) >= monthStart && c.status === 'completed')
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

  const exportReport = async () => {
    try {
      const { data: contributions } = await supabase
        .from('contributions')
        .select('*')
        .eq('status', 'completed');
      
      const { data: loans } = await supabase.from('loans').select('*');

      let csvContent = "TREASURER FINANCIAL REPORT\n";
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      csvContent += "=== SUMMARY ===\n";
      csvContent += `Total Members,${stats.totalMembers}\n`;
      csvContent += `Total Contributions,KES ${stats.totalContributions.toLocaleString()}\n`;
      csvContent += `This Month,KES ${stats.monthlyContributions.toLocaleString()}\n`;
      csvContent += `Pending Contributions,${stats.pendingContributions}\n\n`;

      csvContent += "=== CONTRIBUTIONS ===\n";
      csvContent += "Date,Amount,Type,Payment Method,Status\n";
      contributions?.forEach(c => {
        csvContent += `${c.contribution_date},${c.amount},${c.contribution_type},${c.payment_method},${c.status}\n`;
      });

      csvContent += "\n=== LOANS ===\n";
      csvContent += "Date,Amount,Interest,Total,Status,Due Date\n";
      loans?.forEach(l => {
        csvContent += `${l.created_at.split('T')[0]},${l.amount},${l.interest_amount},${l.total_amount},${l.status},${l.due_date}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `treasurer-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Report Downloaded',
        description: 'Financial report has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'contributions':
        // Treasurer CAN modify contribution statuses (viewOnly = false)
        return <ContributionManagement viewOnly={false} />;
      case 'make-contribution':
        return <MakeContribution onSuccess={() => { fetchStats(); setActiveTab('overview'); }} />;
      case 'record-payment':
        return <RecordManualPayment onSuccess={() => { fetchStats(); setActiveTab('overview'); }} />;
      case 'loans':
        return <LoanManagement />;
      case 'fines':
        return <FinesManagement />;
      default:
        return null;
    }
  };

  if (activeTab !== 'overview') {
    return (
      <div className={activeTab === 'make-contribution' ? "min-h-[60vh] flex flex-col items-center justify-center bg-cover bg-center relative" : ""} style={activeTab === 'make-contribution' ? { backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&h=1080&fit=crop)' } : {}}>
        {activeTab === 'make-contribution' && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />}
        <div className={activeTab === 'make-contribution' ? "relative z-10 w-full max-w-4xl px-4" : ""}>
          <Button variant="ghost" onClick={() => setActiveTab('overview')} className="mb-4">
            ← Back to Dashboard
          </Button>
          {renderContent()}
        </div>
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

      {loading ? (
        <>
          <DashboardStatsSkeleton count={4} columns={4} />
          <QuickActionsSkeleton count={6} />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="stats-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
              </CardContent>
            </Card>
            <Card className="stats-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {stats.totalContributions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="stats-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {stats.monthlyContributions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="stats-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Loans</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingLoans}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Finance Actions</CardTitle>
              <CardDescription>Manage contributions and reports</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <Button variant="outline" className="h-20 flex-col gap-2 action-btn" onClick={() => setActiveTab('contributions')}>
                <Wallet className="h-5 w-5" />
                <span className="text-xs">Manage Contributions</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 action-btn" onClick={() => setActiveTab('make-contribution')}>
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Make Contribution</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 action-btn" onClick={() => setActiveTab('record-payment')}>
                <Plus className="h-5 w-5" />
                <span className="text-xs">Record Manual Payment</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 action-btn" onClick={() => setActiveTab('loans')}>
                <FileText className="h-5 w-5" />
                <span className="text-xs">View Loans</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 action-btn" onClick={() => setActiveTab('fines')}>
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Manage Fines</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2 action-btn" onClick={exportReport}>
                <Download className="h-5 w-5" />
                <span className="text-xs">Export Report</span>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <RotatingImages />
    </div>
  );
}
