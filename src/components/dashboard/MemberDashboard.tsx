import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Calendar, User, CreditCard, History, Clock, AlertTriangle, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MakeContribution } from '@/components/contributions/MakeContribution';
import { MyContributions } from '@/components/contributions/MyContributions';
import { LoanApplication } from '@/components/loans/LoanApplication';
import { LoanRepaymentTracking } from '@/components/loans/LoanRepaymentTracking';
import { ImageSlideshow } from '@/components/layout/ImageSlideshow';
import { RotatingImages } from '@/components/layout/RotatingImages';

interface MemberDashboardProps {
  isFirstLogin?: boolean;
  userName?: string;
}

interface Stats {
  totalContributed: number;
  monthlyContribution: number;
  lastContributionDate: string | null;
  memberSince: string;
  loanStatus: string;
  loanBalance: number;
  finesOwed: number;
  contributionCount: number;
}

type TabType = 'overview' | 'contribute' | 'history' | 'apply-loan' | 'loan-tracking';

export function MemberDashboard({ isFirstLogin = false, userName }: MemberDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<Stats>({
    totalContributed: 0,
    monthlyContribution: 0,
    lastContributionDate: null,
    memberSince: '',
    loanStatus: 'None',
    loanBalance: 0,
    finesOwed: 0,
    contributionCount: 0,
  });
  const [profile, setProfile] = useState<{ full_name: string; member_number: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, member_number, join_date')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setProfile({ full_name: data.full_name, member_number: data.member_number });
      setStats(prev => ({ ...prev, memberSince: data.join_date }));
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      // Fetch contributions
      const { data: contributions, error } = await supabase
        .from('contributions')
        .select('amount, created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (!error && contributions) {
        const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthly = contributions
          .filter(c => new Date(c.created_at) >= monthStart)
          .reduce((sum, c) => sum + Number(c.amount), 0);
        const lastDate = contributions.length > 0 ? contributions[0].created_at : null;
        
        setStats(prev => ({
          ...prev,
          totalContributed: total,
          monthlyContribution: monthly,
          lastContributionDate: lastDate,
          contributionCount: contributions.length,
        }));
      }

      // Fetch active loan
      const { data: loans } = await supabase
        .from('loans')
        .select('status, total_amount')
        .eq('user_id', user.id)
        .in('status', ['approved', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (loans && loans.length > 0) {
        setStats(prev => ({
          ...prev,
          loanStatus: loans[0].status === 'approved' ? 'Active' : 'Pending',
          loanBalance: loans[0].status === 'approved' ? Number(loans[0].total_amount) : 0,
        }));
      }

      // Fetch unpaid fines
      const { data: fines } = await supabase
        .from('fines')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'unpaid');

      if (fines) {
        const totalFines = fines.reduce((sum, f) => sum + Number(f.amount), 0);
        setStats(prev => ({ ...prev, finesOwed: totalFines }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (activeTab === 'contribute') {
    return (
      <div 
        className="min-h-[60vh] flex items-center justify-center bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&h=1080&fit=crop)',
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-4xl px-4">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('overview')} 
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <MakeContribution onSuccess={() => {
            fetchStats();
            setActiveTab('overview');
          }} />
        </div>
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('overview')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <MyContributions />
      </div>
    );
  }

  if (activeTab === 'apply-loan') {
    return (
      <div 
        className="min-h-[60vh] flex items-center justify-center bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&h=1080&fit=crop)',
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-lg px-4">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('overview')} 
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <LoanApplication onSuccess={() => {
            fetchStats();
            setActiveTab('overview');
          }} />
        </div>
      </div>
    );
  }

  if (activeTab === 'loan-tracking') {
    return (
      <div>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('overview')} 
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <LoanRepaymentTracking />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Dashboard</h2>
          <p className="text-muted-foreground">
            {isFirstLogin ? 'Welcome' : 'Welcome back'}, {userName || profile?.full_name || 'Member'}
            {profile?.member_number && ` (${profile.member_number})`}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Member</span>
        </div>
      </div>

      {/* Image Slideshow */}
      <ImageSlideshow />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Contributed</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalContributed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.monthlyContribution.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Contribution</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastContributionDate 
                ? new Date(stats.lastContributionDate).toLocaleDateString()
                : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">Date</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.memberSince 
                ? new Date(stats.memberSince).toLocaleDateString()
                : '--'}
            </div>
            <p className="text-xs text-muted-foreground">Join date</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Status</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${stats.loanStatus === 'Active' ? 'text-amber-600' : stats.loanStatus === 'Pending' ? 'text-yellow-600' : 'text-green-600'}`}>
              {stats.loanStatus}
            </div>
            {stats.loanBalance > 0 && (
              <p className="text-xs text-muted-foreground">Balance: KES {stats.loanBalance.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fines Owed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${stats.finesOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
              KES {stats.finesOwed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding fines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadline</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">End of Month</div>
            <p className="text-xs text-muted-foreground">Monthly contribution due</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your contributions</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('contribute')}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Make Contribution</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('history')}
          >
            <History className="h-5 w-5" />
            <span className="text-xs sm:text-sm">View History</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('apply-loan')}
            disabled={stats.contributionCount < 2}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs sm:text-sm">{stats.contributionCount < 2 ? `Apply (${stats.contributionCount}/2)` : 'Apply Loan'}</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => setActiveTab('loan-tracking')}
            disabled={stats.loanStatus === 'None'}
          >
            <Receipt className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Loan Tracking</span>
          </Button>
        </CardContent>
      </Card>

      {/* Rotating Images */}
      <RotatingImages />
    </div>
  );
}
