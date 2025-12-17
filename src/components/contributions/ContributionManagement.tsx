import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Check, X, Loader2, MoreHorizontal, RotateCcw, Eye } from 'lucide-react';

interface Contribution {
  id: string;
  user_id: string;
  amount: number;
  contribution_type: string;
  payment_method: string;
  mpesa_reference: string | null;
  status: string;
  description: string | null;
  contribution_date: string;
  created_at: string;
  member_name?: string;
}

interface ContributionManagementProps {
  viewOnly?: boolean; // For admin - view only mode
}

export function ContributionManagement({ viewOnly = false }: ContributionManagementProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch member names
      const contributionsWithNames = await Promise.all(
        (data || []).map(async (contribution) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', contribution.user_id)
            .single();
          
          return {
            ...contribution,
            member_name: profile?.full_name || 'Unknown',
          };
        })
      );

      setContributions(contributionsWithNames);
    } catch (error) {
      console.error('Error fetching contributions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch contributions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateContributionStatus = async (id: string, status: 'completed' | 'rejected' | 'pending', userId?: string, amount?: number) => {
    if (viewOnly) return; // Prevent status changes in view-only mode
    
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('contributions')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;

      // Send notification to member
      if (userId && amount) {
        let title = '';
        let message = '';
        let type = '';

        if (status === 'completed') {
          title = 'Contribution Approved';
          message = `Your contribution of KES ${amount.toLocaleString()} has been approved.`;
          type = 'contribution_success';
        } else if (status === 'rejected') {
          title = 'Contribution Rejected';
          message = `Your contribution of KES ${amount.toLocaleString()} has been rejected. Please contact support.`;
          type = 'contribution_failed';
        } else if (status === 'pending') {
          title = 'Contribution Status Updated';
          message = `Your contribution of KES ${amount.toLocaleString()} has been reverted to pending status.`;
          type = 'contribution_pending';
        }

        await supabase.from('notifications').insert({
          user_id: userId,
          title,
          message,
          type,
        });
      }

      toast({
        title: 'Success',
        description: status === 'pending' 
          ? 'Contribution reverted to pending' 
          : `Contribution ${status === 'completed' ? 'approved' : 'rejected'}`,
      });
      fetchContributions();
    } catch (error) {
      console.error('Error updating contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to update contribution',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredContributions = contributions.filter(contribution => {
    const matchesSearch = contribution.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contribution.mpesa_reference?.includes(searchQuery) ||
      contribution.amount.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || contribution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredContributions
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution Management</CardTitle>
        <CardDescription>
          {viewOnly ? 'View all contributions (read-only)' : 'View and manage all contributions'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Contributions</p>
              <p className="text-xl font-bold">KES {totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xl font-bold text-green-600">
                {contributions.filter(c => c.status === 'completed').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {contributions.filter(c => c.status === 'pending').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-xl font-bold text-red-600">
                {contributions.filter(c => c.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by member, reference..."
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
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contributions Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {!viewOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={viewOnly ? 6 : 7} className="text-center py-8 text-muted-foreground">
                    No contributions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContributions.map((contribution) => (
                  <TableRow key={contribution.id}>
                    <TableCell className="font-medium">{contribution.member_name}</TableCell>
                    <TableCell>KES {Number(contribution.amount).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{contribution.contribution_type}</TableCell>
                    <TableCell>{contribution.mpesa_reference || '-'}</TableCell>
                    <TableCell>{new Date(contribution.contribution_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(contribution.status)}</TableCell>
                    {!viewOnly && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={updating === contribution.id}>
                              {updating === contribution.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {contribution.status === 'pending' && (
                              <>
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => updateContributionStatus(
                                    contribution.id, 
                                    'completed',
                                    contribution.user_id,
                                    contribution.amount
                                  )}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => updateContributionStatus(
                                    contribution.id, 
                                    'rejected',
                                    contribution.user_id,
                                    contribution.amount
                                  )}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* Treasurer can revert any status to pending */}
                            {(contribution.status === 'completed' || contribution.status === 'rejected') && (
                              <DropdownMenuItem
                                className="text-yellow-600"
                                onClick={() => updateContributionStatus(
                                  contribution.id, 
                                  'pending',
                                  contribution.user_id,
                                  contribution.amount
                                )}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Revert to Pending
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredContributions.length} of {contributions.length} contributions
        </div>
      </CardContent>
    </Card>
  );
}
