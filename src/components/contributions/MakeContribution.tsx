import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Smartphone, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const pollPaymentStatus = async (transactionId: string, contributionId: string) => {
    let attempts = 0;
    const maxAttempts = 40; // Poll for 120 seconds (40 * 3 seconds)

    pollingRef.current = setInterval(async () => {
      attempts++;
      
      try {
        // Check multiple ways: by transactionId stored in mpesa_reference or by checkout_request_id
        const { data, error } = await supabase
          .from('mpesa_transactions')
          .select('status, mpesa_reference, checkout_request_id')
          .or(`checkout_request_id.eq.${transactionId},mpesa_reference.eq.${transactionId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Also check contribution directly
        const { data: contrib } = await supabase
          .from('contributions')
          .select('status')
          .eq('id', contributionId)
          .single();

        if (contrib?.status === 'completed') {
          clearInterval(pollingRef.current!);
          setPaymentStatus('success');
          toast({
            title: 'Payment Successful!',
            description: `Your contribution of KES ${amount.toLocaleString()} has been received.`,
          });
          setTimeout(() => onSuccess?.(), 2000);
          return;
        }

        if (!error && data) {
          // Check for 'success' OR 'completed' status (webhook sets 'success')
          if (data.status === 'success' || data.status === 'completed') {
            clearInterval(pollingRef.current!);
            setPaymentStatus('success');
            
            // Update contribution status
            await supabase
              .from('contributions')
              .update({ status: 'completed', mpesa_reference: data.mpesa_reference })
              .eq('id', contributionId);

            // Create success notification
            await supabase.from('notifications').insert({
              user_id: user?.id,
              title: 'Payment Successful',
              message: `Your M-Pesa payment of KES ${amount.toLocaleString()} was successful.`,
              type: 'contribution_success',
              related_type: 'contribution',
              related_id: contributionId,
            });

            toast({
              title: 'Payment Successful!',
              description: `Your contribution of KES ${amount.toLocaleString()} has been received.`,
            });

            setTimeout(() => onSuccess?.(), 2000);
          } else if (data.status === 'failed') {
            clearInterval(pollingRef.current!);
            setPaymentStatus('failed');
            
            // Update contribution status
            await supabase
              .from('contributions')
              .update({ status: 'failed' })
              .eq('id', contributionId);

            toast({
              title: 'Payment Failed',
              description: 'The M-Pesa payment was not completed. Please try again.',
              variant: 'destructive',
            });
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        setPaymentStatus('idle');
        toast({
          title: 'Payment Timeout',
          description: 'Payment verification timed out. Please check your M-Pesa messages.',
          variant: 'destructive',
        });
      }
    }, 3000);
  };

  const handlePayNow = async () => {
    if (!user) return;
    
    setLoading(true);
    setPaymentStatus('processing');
    
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

      // Format phone number
      let formattedPhone = phoneNumber.replace(/\s/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.slice(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      // Call the M-Pesa STK push edge function
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: formattedPhone,
          amount: amount,
          userId: user.id,
          contributionType: contributionType,
          description: `${contributionType} contribution`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const txnId = data.transactionId || data.checkoutRequestId || data.internalId;
        setTransactionId(txnId);
        
        toast({
          title: 'M-Pesa Prompt Sent',
          description: 'Please check your phone and enter your M-Pesa PIN to complete payment.',
        });

        // Start polling for payment status using any available ID
        if (txnId) {
          pollPaymentStatus(txnId, contribution.id);
        }
      } else {
        throw new Error(data?.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
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
    <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto px-4">
      {/* Pay With Section */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pay with</CardTitle>
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded font-medium">Live Mode</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">M-PESA</p>
              <p className="text-sm text-muted-foreground truncate">Pay via mobile money</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Phone: {phoneNumber}</p>
          </div>

          {paymentStatus === 'processing' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Waiting for payment...</p>
              <p className="text-xs text-blue-600">Please enter your M-Pesa PIN on your phone</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center animate-in fade-in zoom-in duration-300">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
              <p className="text-lg font-bold text-green-800 dark:text-green-200">Payment Successful!</p>
              <p className="text-sm text-green-600 mt-1">KES {amount.toLocaleString()} received</p>
              <p className="text-xs text-green-500 mt-2">Redirecting to dashboard...</p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
              <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Payment Failed</p>
              <p className="text-xs text-red-600">Please try again</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="capitalize">{contributionType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>KES {amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction Fee:</span>
              <span>KES 0.00</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">KES {amount.toLocaleString()}</span>
            </div>
          </div>

          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white" 
            size="lg"
            onClick={handlePayNow}
            disabled={loading || paymentStatus === 'processing' || paymentStatus === 'success'}
          >
            {loading || paymentStatus === 'processing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : paymentStatus === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Paid
              </>
            ) : (
              'Pay Now'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment processing via M-Pesa
          </p>

          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="w-full"
            disabled={paymentStatus === 'processing'}
          >
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
  const { toast } = useToast();

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || Number(formData.amount) < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum amount is KES 10',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
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
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg md:text-xl">Make Contribution</CardTitle>
            <CardDescription className="text-sm">Submit your M-Pesa contribution</CardDescription>
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
              className="text-base"
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
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Enter the M-Pesa registered phone number
            </p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            <span>Continue to Payment</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
