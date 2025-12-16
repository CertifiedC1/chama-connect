import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
}

interface RecordManualPaymentProps {
  onSuccess?: () => void;
}

export function RecordManualPayment({ onSuccess }: RecordManualPaymentProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [contributionType, setContributionType] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load members',
        variant: 'destructive',
      });
    } finally {
      setFetchingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember || !amount) {
      toast({
        title: 'Error',
        description: 'Please select a member and enter an amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Record the contribution
      const { error: contribError } = await supabase
        .from('contributions')
        .insert({
          user_id: selectedMember,
          amount: Number(amount),
          contribution_type: contributionType,
          payment_method: 'cash',
          description: note || 'Manual cash payment recorded by treasurer',
          status: 'completed',
        });

      if (contribError) throw contribError;

      // Create notification for the member
      await supabase.from('notifications').insert({
        user_id: selectedMember,
        title: 'Payment Recorded',
        message: `A cash payment of KES ${Number(amount).toLocaleString()} has been recorded for your account.`,
        type: 'contribution_success',
      });

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      // Reset form
      setSelectedMember('');
      setAmount('');
      setNote('');
      setContributionType('monthly');
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Record Manual Payment</CardTitle>
        <CardDescription>
          Record a cash payment received from a member
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member">Select Member</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder={fetchingMembers ? "Loading members..." : "Select a member"} />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name} ({member.phone_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Contribution Type</Label>
            <Select value={contributionType} onValueChange={setContributionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Contribution</SelectItem>
                <SelectItem value="special">Special Contribution</SelectItem>
                <SelectItem value="emergency">Emergency Fund</SelectItem>
                <SelectItem value="fine_payment">Fine Payment</SelectItem>
                <SelectItem value="loan_repayment">Loan Repayment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note about this payment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Payment'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
