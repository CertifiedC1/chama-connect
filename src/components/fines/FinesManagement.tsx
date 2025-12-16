import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Plus, Loader2, AlertTriangle } from 'lucide-react';

interface Fine {
  id: string;
  user_id: string;
  amount: number;
  fine_type: string;
  reason: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  member_name?: string;
}

interface Member {
  id: string;
  full_name: string;
}

export function FinesManagement() {
  const { user } = useAuth();
  const [fines, setFines] = useState<Fine[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newFine, setNewFine] = useState({
    userId: '',
    amount: '',
    fineType: 'late_contribution',
    reason: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFines();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'active');
    
    if (data) setMembers(data);
  };

  const fetchFines = async () => {
    try {
      const { data, error } = await supabase
        .from('fines')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const finesWithNames = await Promise.all(
        (data || []).map(async (fine) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', fine.user_id)
            .single();
          
          return {
            ...fine,
            member_name: profile?.full_name || 'Unknown',
          };
        })
      );

      setFines(finesWithNames);
    } catch (error) {
      console.error('Error fetching fines:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch fines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addFine = async () => {
    if (!user || !newFine.userId || !newFine.amount) return;
    
    setAdding(true);
    try {
      const { error } = await supabase.from('fines').insert({
        user_id: newFine.userId,
        amount: Number(newFine.amount),
        fine_type: newFine.fineType,
        reason: newFine.reason || null,
        created_by: user.id,
        status: 'unpaid',
      });

      if (error) throw error;

      // Notify the member
      const member = members.find(m => m.id === newFine.userId);
      await supabase.from('notifications').insert({
        user_id: newFine.userId,
        title: 'Fine Issued',
        message: `A fine of KES ${Number(newFine.amount).toLocaleString()} has been issued for ${newFine.fineType.replace('_', ' ')}.${newFine.reason ? ` Reason: ${newFine.reason}` : ''}`,
        type: 'fine_issued',
      });

      toast({
        title: 'Fine Added',
        description: `Fine of KES ${Number(newFine.amount).toLocaleString()} added for ${member?.full_name}`,
      });

      setShowAddDialog(false);
      setNewFine({ userId: '', amount: '', fineType: 'late_contribution', reason: '' });
      fetchFines();
    } catch (error: any) {
      console.error('Error adding fine:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add fine',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const markAsPaid = async (fineId: string, userId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('fines')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', fineId);

      if (error) throw error;

      // Notify the member
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Fine Paid',
        message: `Your fine of KES ${amount.toLocaleString()} has been marked as paid.`,
        type: 'fine_paid',
      });

      toast({ title: 'Success', description: 'Fine marked as paid' });
      fetchFines();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update fine', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredFines = fines.filter(fine => {
    const matchesSearch = fine.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fine.fine_type.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || fine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnpaid = fines
    .filter(f => f.status === 'unpaid')
    .reduce((sum, f) => sum + Number(f.amount), 0);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Fines & Penalties
              </CardTitle>
              <CardDescription>View and manage member fines</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fine
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Manual Fine</DialogTitle>
                  <DialogDescription>Issue a fine to a member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select 
                      value={newFine.userId} 
                      onValueChange={(v) => setNewFine({ ...newFine, userId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fine Type</Label>
                    <Select 
                      value={newFine.fineType} 
                      onValueChange={(v) => setNewFine({ ...newFine, fineType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="late_contribution">Late Contribution</SelectItem>
                        <SelectItem value="late_loan_payment">Late Loan Payment</SelectItem>
                        <SelectItem value="meeting_absence">Meeting Absence</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (KES)</Label>
                    <Input
                      type="number"
                      value={newFine.amount}
                      onChange={(e) => setNewFine({ ...newFine, amount: e.target.value })}
                      placeholder="Enter amount"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      value={newFine.reason}
                      onChange={(e) => setNewFine({ ...newFine, reason: e.target.value })}
                      placeholder="Reason for the fine..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addFine} disabled={adding || !newFine.userId || !newFine.amount}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Fine
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Fines</p>
                <p className="text-xl font-bold">{fines.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
                <p className="text-xl font-bold text-red-600">
                  {fines.filter(f => f.status === 'unpaid').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unpaid</p>
                <p className="text-xl font-bold text-red-600">KES {totalUnpaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-600">
                  {fines.filter(f => f.status === 'paid').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by member..."
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
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fines Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No fines found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFines.map((fine) => (
                    <TableRow key={fine.id}>
                      <TableCell className="font-medium">{fine.member_name}</TableCell>
                      <TableCell className="capitalize">{fine.fine_type.replace('_', ' ')}</TableCell>
                      <TableCell>KES {Number(fine.amount).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{fine.reason || '-'}</TableCell>
                      <TableCell>{new Date(fine.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(fine.status)}</TableCell>
                      <TableCell className="text-right">
                        {fine.status === 'unpaid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsPaid(fine.id, fine.user_id, fine.amount)}
                          >
                            Mark Paid
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
    </>
  );
}
