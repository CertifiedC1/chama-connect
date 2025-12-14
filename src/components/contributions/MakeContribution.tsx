import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';

interface MakeContributionProps {
  onSuccess?: () => void;
}

export function MakeContribution({ onSuccess }: MakeContributionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    contributionType: 'monthly',
    mpesaReference: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid contribution amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('contributions').insert({
        user_id: user.id,
        amount: Number(formData.amount),
        contribution_type: formData.contributionType,
        payment_method: 'mpesa',
        mpesa_reference: formData.mpesaReference || null,
        description: formData.description || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Contribution submitted',
        description: 'Your contribution has been submitted for approval',
      });

      setFormData({
        amount: '',
        contributionType: 'monthly',
        mpesaReference: '',
        description: '',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit contribution',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              min="1"
              required
            />
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
            <Label htmlFor="reference">M-Pesa Reference (Optional)</Label>
            <Input
              id="reference"
              placeholder="e.g., QJK123ABC"
              value={formData.mpesaReference}
              onChange={(e) => setFormData({ ...formData, mpesaReference: e.target.value.toUpperCase() })}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Enter the M-Pesa transaction code for verification
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this contribution..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">M-Pesa Payment Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Go to M-Pesa on your phone</li>
              <li>2. Select "Lipa na M-Pesa"</li>
              <li>3. Select "Pay Bill" or "Send Money"</li>
              <li>4. Enter the Chama account details</li>
              <li>5. Enter the amount and confirm</li>
              <li>6. Enter the reference code above</li>
            </ol>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CreditCard className="mr-2 h-4 w-4" />
            Submit Contribution
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}