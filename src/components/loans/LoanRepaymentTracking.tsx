import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CreditCard, Calendar, DollarSign } from 'lucide-react';

interface Loan {
  id: string;
  amount: number;
  interest_rate: number;
  interest_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface Repayment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  mpesa_reference: string | null;
}

export function LoanRepaymentTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLoanData();
    }
  }, [user]);

  const fetchLoanData = async () => {
    if (!user) return;

    try {
      // Fetch active loan
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (loanError && loanError.code !== 'PGRST116') {
        throw loanError;
      }

      if (loanData) {
        setLoan(loanData);

        // Fetch repayments for this loan
        const { data: repaymentData, error: repaymentError } = await supabase
          .from('loan_repayments')
          .select('*')
          .eq('loan_id', loanData.id)
          .order('created_at', { ascending: false });

        if (!repaymentError && repaymentData) {
          setRepayments(repaymentData);
        }
      }
    } catch (error) {
      console.error('Error fetching loan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRepaid = repayments
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const remainingBalance = loan ? Number(loan.total_amount) - totalRepaid : 0;
  const repaymentProgress = loan ? (totalRepaid / Number(loan.total_amount)) * 100 : 0;

  const isOverdue = loan && new Date(loan.due_date) < new Date() && remainingBalance > 0;
  const daysUntilDue = loan ? Math.ceil((new Date(loan.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loan) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No active loan to track</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loan Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Loan Repayment Tracking
              </CardTitle>
              <CardDescription>Track your loan repayment progress</CardDescription>
            </div>
            {isOverdue ? (
              <Badge variant="destructive">Overdue</Badge>
            ) : remainingBalance === 0 ? (
              <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800">Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="font-medium">{repaymentProgress.toFixed(1)}%</span>
            </div>
            <Progress value={repaymentProgress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>KES {totalRepaid.toLocaleString()} paid</span>
              <span>KES {remainingBalance.toLocaleString()} remaining</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Principal</p>
              <p className="font-bold">KES {Number(loan.amount).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-lg mb-1">📊</p>
              <p className="text-xs text-muted-foreground">Interest ({loan.interest_rate}%)</p>
              <p className="font-bold">KES {Number(loan.interest_amount).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-lg mb-1">💰</p>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="font-bold">KES {Number(loan.total_amount).toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${isOverdue ? 'bg-red-100 dark:bg-red-950' : 'bg-muted'}`}>
              <Calendar className={`h-5 w-5 mx-auto mb-1 ${isOverdue ? 'text-red-600' : 'text-primary'}`} />
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className={`font-bold ${isOverdue ? 'text-red-600' : ''}`}>
                {new Date(loan.due_date).toLocaleDateString()}
              </p>
              {!isOverdue && daysUntilDue > 0 && (
                <p className="text-xs text-muted-foreground">{daysUntilDue} days left</p>
              )}
            </div>
          </div>

          {/* Remaining Balance Alert */}
          {remainingBalance > 0 && (
            <div className={`p-4 rounded-lg ${isOverdue ? 'bg-red-50 dark:bg-red-950/30 border border-red-200' : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200'}`}>
              <p className={`font-medium ${isOverdue ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
                {isOverdue ? '⚠️ Payment Overdue' : '💡 Remaining Balance'}
              </p>
              <p className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                KES {remainingBalance.toLocaleString()}
              </p>
              {isOverdue && (
                <p className="text-sm text-red-600 mt-1">
                  Please make a payment to avoid additional fines
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repayment History */}
      <Card>
        <CardHeader>
          <CardTitle>Repayment History</CardTitle>
          <CardDescription>All payments made towards this loan</CardDescription>
        </CardHeader>
        <CardContent>
          {repayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No repayments made yet
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repayments.map((repayment) => (
                    <TableRow key={repayment.id}>
                      <TableCell>{new Date(repayment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">KES {Number(repayment.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{repayment.mpesa_reference || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            repayment.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : repayment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {repayment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
