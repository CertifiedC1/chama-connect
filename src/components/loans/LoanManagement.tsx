import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Check, X, Loader2, Eye } from 'lucide-react';

interface Loan {
  id: string;
  user_id: string;
  amount: number;
  interest_rate: number;
  interest_amount: number;
  total_amount: number;
  purpose: string | null;
  phone_number: string;
  status: string;
  due_date: string;
  created_at: string;
  member_name?: string;
}

export function LoanManagement() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const loansWithNames = await Promise.all(
        (data || []).map(async (loan) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', loan.user_id)
            .single();
          
          return {
            ...loan,
            member_name: profile?.full_name || 'Unknown',
          };
        })
      );

      setLoans(loansWithNames);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch loans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveLoan = async (loan: Loan) => {
    if (!user) return;
    setUpdating(loan.id);
    
    try {
      const { error } = await supabase
        .from('loans')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', loan.id);
      
      if (error) throw error;

      // Notify the member
      await supabase.from('notifications').insert({
        user_id: loan.user_id,
        title: 'Loan Approved!',
        message: `Your loan of KES ${loan.amount.toLocaleString()} has been approved. Total repayment: KES ${loan.total_amount.toLocaleString()} by ${new Date(loan.due_date).toLocaleDateString()}`,
        type: 'loan_approved',
        related_type: 'loan',
        related_id: loan.id,
      });

      toast({
        title: 'Loan Approved',
        description: `Loan for ${loan.member_name} has been approved.`,
      });
      fetchLoans();
    } catch (error: any) {
      console.error('Error approving loan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve loan',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const rejectLoan = async () => {
    if (!selectedLoan) return;
    setUpdating(selectedLoan.id);
    
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: 'rejected' })
        .eq('id', selectedLoan.id);
      
      if (error) throw error;

      // Notify the member
      await supabase.from('notifications').insert({
        user_id: selectedLoan.user_id,
        title: 'Loan Rejected',
        message: `Your loan application of KES ${selectedLoan.amount.toLocaleString()} has been rejected.${rejectReason ? ` Reason: ${rejectReason}` : ''}`,
        type: 'loan_rejected',
        related_type: 'loan',
        related_id: selectedLoan.id,
      });

      toast({
        title: 'Loan Rejected',
        description: `Loan for ${selectedLoan.member_name} has been rejected.`,
      });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedLoan(null);
      fetchLoans();
    } catch (error: any) {
      console.error('Error rejecting loan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject loan',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'repaid':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Repaid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.amount.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPending = loans.filter(l => l.status === 'pending').length;
  const totalApproved = loans.filter(l => l.status === 'approved').reduce((sum, l) => sum + Number(l.total_amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Loan Management</CardTitle>
          <CardDescription>View and manage loan applications</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Loans</p>
                <p className="text-xl font-bold">{loans.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{totalPending}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Amount</p>
                <p className="text-xl font-bold text-green-600">KES {totalApproved.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-xl font-bold text-red-600">
                  {loans.filter(l => l.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by member, amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="repaid">Repaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loans Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No loans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.member_name}</TableCell>
                      <TableCell>KES {Number(loan.amount).toLocaleString()}</TableCell>
                      <TableCell>{loan.interest_rate}%</TableCell>
                      <TableCell className="font-medium">KES {Number(loan.total_amount).toLocaleString()}</TableCell>
                      <TableCell>{new Date(loan.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell className="text-right">
                        {loan.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => approveLoan(loan)}
                              disabled={updating === loan.id}
                            >
                              {updating === loan.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setShowRejectDialog(true);
                              }}
                              disabled={updating === loan.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {loan.status !== 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLoan(loan)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this loan application for {selectedLoan?.member_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>Amount:</strong> KES {selectedLoan?.amount.toLocaleString()}</p>
              <p className="text-sm"><strong>Purpose:</strong> {selectedLoan?.purpose || 'Not specified'}</p>
            </div>
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={rejectLoan}
              disabled={updating === selectedLoan?.id}
            >
              {updating === selectedLoan?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
