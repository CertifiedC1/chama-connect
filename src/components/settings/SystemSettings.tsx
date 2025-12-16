import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, Wallet, CreditCard, AlertTriangle, Shield, Users, FileText, Settings } from 'lucide-react';

export function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Chama Profile
    chama_name: 'My Chama',
    chama_logo: '',
    description: '',
    start_date: '',
    meeting_day: 1,
    // Contribution Settings
    contribution_amount: 1000,
    contribution_frequency: 'monthly',
    grace_period_days: 3,
    late_contribution_fine: 100,
    enable_auto_fines: true,
    // Loan Settings
    max_loan_amount: 50000,
    loan_eligibility_months: 2,
    loan_interest_rate: 10,
    interest_type: 'flat',
    max_repayment_months: 6,
    late_loan_fine: 200,
    enable_loan_auto_fines: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chama_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          chama_name: data.chama_name || 'My Chama',
          chama_logo: data.chama_logo || '',
          description: data.description || '',
          start_date: data.start_date || '',
          meeting_day: data.meeting_day || 1,
          contribution_amount: data.contribution_amount || 1000,
          contribution_frequency: data.contribution_frequency || 'monthly',
          grace_period_days: data.grace_period_days || 3,
          late_contribution_fine: data.late_contribution_fine || 100,
          enable_auto_fines: data.enable_auto_fines ?? true,
          max_loan_amount: data.max_loan_amount || 50000,
          loan_eligibility_months: data.loan_eligibility_months || 2,
          loan_interest_rate: data.loan_interest_rate || 10,
          interest_type: data.interest_type || 'flat',
          max_repayment_months: data.max_repayment_months || 6,
          late_loan_fine: data.late_loan_fine || 200,
          enable_loan_auto_fines: data.enable_loan_auto_fines ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('chama_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('chama_settings')
          .update(settings)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chama_settings')
          .insert(settings);
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, chama_logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Settings</h2>
        <p className="text-muted-foreground">Configure your Chama settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="contributions" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Contributions</span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Loans</span>
          </TabsTrigger>
          <TabsTrigger value="fines" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Fines</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Chama Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Chama Profile Settings
              </CardTitle>
              <CardDescription>Basic information about your Chama</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chama_name">Chama Name</Label>
                <Input
                  id="chama_name"
                  value={settings.chama_name}
                  onChange={(e) => setSettings({ ...settings, chama_name: e.target.value })}
                  placeholder="Enter Chama name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chama_logo">Chama Logo</Label>
                <div className="flex items-center gap-4">
                  {settings.chama_logo && (
                    <img 
                      src={settings.chama_logo} 
                      alt="Chama Logo" 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <Input
                    id="chama_logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="max-w-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description / Purpose</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Describe your Chama's purpose..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={settings.start_date}
                    onChange={(e) => setSettings({ ...settings, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting_day">Meeting Day (Day of Month)</Label>
                  <Select 
                    value={settings.meeting_day.toString()} 
                    onValueChange={(v) => setSettings({ ...settings, meeting_day: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contribution Settings */}
        <TabsContent value="contributions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Contribution Settings
              </CardTitle>
              <CardDescription>Configure contribution rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contribution_amount">Standard Amount (KES)</Label>
                  <Input
                    id="contribution_amount"
                    type="number"
                    value={settings.contribution_amount}
                    onChange={(e) => setSettings({ ...settings, contribution_amount: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contribution_frequency">Frequency</Label>
                  <Select 
                    value={settings.contribution_frequency} 
                    onValueChange={(v) => setSettings({ ...settings, contribution_frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grace_period_days">Grace Period (Days)</Label>
                  <Input
                    id="grace_period_days"
                    type="number"
                    value={settings.grace_period_days}
                    onChange={(e) => setSettings({ ...settings, grace_period_days: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="late_contribution_fine">Late Fine (KES)</Label>
                  <Input
                    id="late_contribution_fine"
                    type="number"
                    value={settings.late_contribution_fine}
                    onChange={(e) => setSettings({ ...settings, late_contribution_fine: Number(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Enable Auto-Fines</p>
                  <p className="text-sm text-muted-foreground">Automatically apply fines for late contributions</p>
                </div>
                <Switch
                  checked={settings.enable_auto_fines}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_auto_fines: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loan Settings */}
        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Loan Settings
              </CardTitle>
              <CardDescription>Configure loan rules and interest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_loan_amount">Maximum Loan (KES)</Label>
                  <Input
                    id="max_loan_amount"
                    type="number"
                    value={settings.max_loan_amount}
                    onChange={(e) => setSettings({ ...settings, max_loan_amount: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan_eligibility_months">Eligibility (Contributions)</Label>
                  <Input
                    id="loan_eligibility_months"
                    type="number"
                    value={settings.loan_eligibility_months}
                    onChange={(e) => setSettings({ ...settings, loan_eligibility_months: Number(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loan_interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="loan_interest_rate"
                    type="number"
                    value={settings.loan_interest_rate}
                    onChange={(e) => setSettings({ ...settings, loan_interest_rate: Number(e.target.value) })}
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest_type">Interest Type</Label>
                  <Select 
                    value={settings.interest_type} 
                    onValueChange={(v) => setSettings({ ...settings, interest_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="reducing">Reducing Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_repayment_months">Max Repayment Period (Months)</Label>
                  <Input
                    id="max_repayment_months"
                    type="number"
                    value={settings.max_repayment_months}
                    onChange={(e) => setSettings({ ...settings, max_repayment_months: Number(e.target.value) })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="late_loan_fine">Late Repayment Fine (KES)</Label>
                  <Input
                    id="late_loan_fine"
                    type="number"
                    value={settings.late_loan_fine}
                    onChange={(e) => setSettings({ ...settings, late_loan_fine: Number(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Enable Loan Auto-Fines</p>
                  <p className="text-sm text-muted-foreground">Automatically apply fines for late loan repayments</p>
                </div>
                <Switch
                  checked={settings.enable_loan_auto_fines}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_loan_auto_fines: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fine Settings */}
        <TabsContent value="fines">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Fine & Penalty Settings
              </CardTitle>
              <CardDescription>Configure fines and penalties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h4 className="font-medium">Fine Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-background rounded border">
                    <p className="font-medium">Late Contribution</p>
                    <p className="text-sm text-muted-foreground">KES {settings.late_contribution_fine}</p>
                  </div>
                  <div className="p-3 bg-background rounded border">
                    <p className="font-medium">Late Loan Payment</p>
                    <p className="text-sm text-muted-foreground">KES {settings.late_loan_fine}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Auto-Fine Triggers</h4>
                <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  <li>• Late contribution: {settings.grace_period_days} days after due date</li>
                  <li>• Late loan repayment: After due date passes</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Manual Fine Permissions</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Admin and Treasurer can apply manual fines to members
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Password Policy</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum 6 characters required for all passwords
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Session Timeout</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Sessions automatically expire after inactivity
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  2FA is available through email verification on signup
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
