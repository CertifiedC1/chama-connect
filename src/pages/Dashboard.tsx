import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { TreasurerDashboard } from '@/components/dashboard/TreasurerDashboard';
import { MemberDashboard } from '@/components/dashboard/MemberDashboard';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';
import { DashboardFooter } from '@/components/layout/DashboardFooter';
import { NotificationBell } from '@/components/layout/NotificationBell';

export default function Dashboard() {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkFirstLogin();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  const checkFirstLogin = () => {
    // Check if this is the first login by looking at user metadata
    const lastSignIn = user?.last_sign_in_at;
    const createdAt = user?.created_at;
    
    if (lastSignIn && createdAt) {
      const lastSignInDate = new Date(lastSignIn);
      const createdDate = new Date(createdAt);
      // If the difference is less than 1 minute, consider it first login
      const diff = Math.abs(lastSignInDate.getTime() - createdDate.getTime());
      setIsFirstLogin(diff < 60000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const renderDashboard = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard isFirstLogin={isFirstLogin} userName={profile?.full_name} />;
      case 'treasurer':
        return <TreasurerDashboard isFirstLogin={isFirstLogin} userName={profile?.full_name} />;
      default:
        return <MemberDashboard isFirstLogin={isFirstLogin} userName={profile?.full_name} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Chama App</h1>
              <p className="text-xs text-muted-foreground capitalize">{userRole || 'Member'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown 
              fullName={profile?.full_name || 'User'} 
              email={user.email || ''} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 flex-1">
        {renderDashboard()}
      </main>

      {/* Footer */}
      <DashboardFooter />
    </div>
  );
}
