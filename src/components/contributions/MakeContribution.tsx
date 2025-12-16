import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Smartphone, ArrowRight } from 'lucide-react';

interface MakeContributionProps {
  onSuccess?: () => void;
}

interface PaymentPageProps {
  amount: number;
  phoneNumber: string;
  contributionType: string;
  onBack: () => void;
  onSuccess?: () => void;
}

function PaymentPage({ amount, phoneNumber, contributionType, onBack, onSuccess }: PaymentPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First create a pending contribution record
      const { data: contribution, error: contribError } = await supabase
        .from('contributions')
        .insert({
          user_id: user.id,
          amount: amount,
          contribution_type: contributionType,
          payment_method: 'mpesa',
          status: 'pending',
        })
        .select()
        .single();

      if (contribError) throw contribError;

      // Call the M-Pesa STK push edge function
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber,
          amount: amount,
          userId: user.id,
          relatedType: 'contribution',
          relatedId: contribution.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'M-Pesa Prompt Sent',
          description: 'Please check your phone and enter your M-Pesa PIN to complete payment.',
        });

        // Create notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Payment Initiated',
          message: `M-Pesa payment of KES ${amount.toLocaleString()} initiated. Please complete on your phone.`,
          type: 'contribution_pending',
        });

        onSuccess?.();
      } else {
        throw new Error(data?.message || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initiate M-Pesa payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Pay With Section */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pay with</CardTitle>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Test Mode</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <p className="font-medium">MPESA</p>
              <p className="text-sm text-muted-foreground">Pay via mobile money (Test Mode)</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            All payments are in test mode. No real transactions will occur.
          </p>
        </CardContent>
      </Card>

      {/* Order Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>KES {amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxes:</span>
              <span>KES 0.00</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">KES {amount.toLocaleString()}</span>
            </div>
          </div>

          <Button 
            className="w-full bg-red-500 hover:bg-red-600 text-white" 
            size="lg"
            onClick={handlePayNow}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment processing. Your payment will be completed within 30 seconds.
          </p>

          <Button variant="ghost" onClick={onBack} className="w-full">
            ← Back to form
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function MakeContribution({ onSuccess }: MakeContributionProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    contributionType: 'monthly',
    phoneNumber: '',
  });

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || Number(formData.amount) < 10) {
      return;
    }
    
    if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
      return;
    }
    
    setShowPayment(true);
  };

  if (showPayment) {
    return (
      <PaymentPage
        amount={Number(formData.amount)}
        phoneNumber={formData.phoneNumber}
        contributionType={formData.contributionType}
        onBack={() => setShowPayment(false)}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Make Contribution</CardTitle>
            <CardDescription>Submit your M-Pesa contribution</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleContinue} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              min="10"
              required
            />
            <p className="text-xs text-muted-foreground">Minimum amount: KES 10</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Contribution Type</Label>
            <Select 
              value={formData.contributionType} 
              onValueChange={(value) => setFormData({ ...formData, contributionType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Contribution</SelectItem>
                <SelectItem value="special">Special Contribution</SelectItem>
                <SelectItem value="fine">Fine Payment</SelectItem>
                <SelectItem value="loan_repayment">Loan Repayment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712345678"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the M-Pesa registered phone number
            </p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            <span>Submit Contribution</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
