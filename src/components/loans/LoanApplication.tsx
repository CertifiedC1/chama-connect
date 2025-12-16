import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoanApplicationProps {
  onSuccess?: () => void;
}

export function LoanApplication({ onSuccess }: LoanApplicationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [contributionCount, setContributionCount] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    phoneNumber: '',
    repaymentMonths: '3',
  });

  useEffect(() => {
    checkEligibility();
    fetchSettings();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone_number')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setFormData(prev => ({ ...prev, phoneNumber: data.phone_number || '' }));
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('chama_settings')
      .select('*')
      .single();
    
    if (data) {
      setSettings(data);
    }
  };

  const checkEligibility = async () => {
    if (!user) return;
    
    try {
      // Count completed contributions
      const { data: contributions, error } = await supabase
        .from('contributions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (!error && contributions) {
        setContributionCount(contributions.length);
        setIsEligible(contributions.length >= 2);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const calculateInterest = () => {
    if (!settings || !formData.amount) return { interest: 0, total: 0 };
    
    const principal = Number(formData.amount);
    const rate = settings.loan_interest_rate / 100;
    const interest = settings.interest_type === 'flat' 
      ? principal * rate 
      : principal * rate * Number(formData.repaymentMonths) / 12;
    
    return {
      interest: Math.round(interest),
      total: Math.round(principal + interest),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !isEligible) return;

    const amount = Number(formData.amount);
    
    if (settings && amount > settings.max_loan_amount) {
      toast({
        title: 'Error',
        description: `Maximum loan amount is KES ${settings.max_loan_amount.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { interest, total } = calculateInterest();
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + Number(formData.repaymentMonths));

      const { error } = await supabase.from('loans').insert({
        user_id: user.id,
        amount: amount,
        interest_rate: settings?.loan_interest_rate || 10,
        interest_amount: interest,
        total_amount: total,
        purpose: formData.purpose,
        phone_number: formData.phoneNumber,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      });

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Loan Application Submitted',
        message: `Your loan application for KES ${amount.toLocaleString()} is pending approval.`,
        type: 'loan_pending',
      });

      // Notify admins about new loan application
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.user_id,
          title: 'New Loan Application',
          message: `${profile?.full_name || 'A member'} has applied for a loan of KES ${amount.toLocaleString()}`,
          type: 'loan_pending',
        }));
        
        await supabase.from('notifications').insert(adminNotifications);
      }

      toast({
        title: 'Application Submitted',
        description: 'Your loan application is now pending approval.',
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting loan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit loan application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingEligibility) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Checking eligibility...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isEligible) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Apply for Loan</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need at least 2 completed contributions to apply for a loan. 
              You currently have {contributionCount} contribution(s).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { interest, total } = calculateInterest();

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Apply for Loan
          <CheckCircle className="h-5 w-5 text-green-500" />
        </CardTitle>
        <CardDescription>
          You're eligible! You have {contributionCount} contributions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Loan Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              max={settings?.max_loan_amount}
              min="100"
              required
            />
            {settings && (
              <p className="text-xs text-muted-foreground">
                Maximum: KES {settings.max_loan_amount?.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number (for M-Pesa)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="0712345678"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repaymentMonths">Repayment Period</Label>
            <select
              id="repaymentMonths"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={formData.repaymentMonths}
              onChange={(e) => setFormData(prev => ({ ...prev, repaymentMonths: e.target.value }))}
            >
              {[1, 2, 3, 4, 5, 6].map(months => (
                <option key={months} value={months}>
                  {months} month{months > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <Textarea
              id="purpose"
              placeholder="What do you need the loan for?"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              rows={3}
            />
          </div>

          {formData.amount && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Principal:</span>
                <span>KES {Number(formData.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Interest ({settings?.loan_interest_rate || 10}%):</span>
                <span>KES {interest.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Repayment:</span>
                <span>KES {total.toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Apply for Loan'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
