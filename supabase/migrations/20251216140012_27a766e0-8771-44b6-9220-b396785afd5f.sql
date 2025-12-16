-- Create loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 10,
  interest_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  purpose TEXT,
  phone_number TEXT NOT NULL,
  due_date DATE NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan_repayments table
CREATE TABLE public.loan_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  mpesa_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fines table
CREATE TABLE public.fines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fine_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid',
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chama_settings table (singleton for system settings)
CREATE TABLE public.chama_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_name TEXT NOT NULL DEFAULT 'My Chama',
  chama_logo TEXT,
  description TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  meeting_day INTEGER DEFAULT 1,
  contribution_amount NUMERIC DEFAULT 1000,
  contribution_frequency TEXT DEFAULT 'monthly',
  grace_period_days INTEGER DEFAULT 3,
  late_contribution_fine NUMERIC DEFAULT 100,
  enable_auto_fines BOOLEAN DEFAULT true,
  max_loan_amount NUMERIC DEFAULT 50000,
  loan_eligibility_months INTEGER DEFAULT 2,
  loan_interest_rate NUMERIC DEFAULT 10,
  interest_type TEXT DEFAULT 'flat',
  max_repayment_months INTEGER DEFAULT 6,
  late_loan_fine NUMERIC DEFAULT 200,
  enable_loan_auto_fines BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mpesa_transactions table for tracking payments
CREATE TABLE public.mpesa_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  mpesa_reference TEXT,
  checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chama_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Loans policies
CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all loans" ON public.loans FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update loans" ON public.loans FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Treasurers can view all loans" ON public.loans FOR SELECT USING (has_role(auth.uid(), 'treasurer'::app_role));

-- Loan repayments policies
CREATE POLICY "Users can view own repayments" ON public.loan_repayments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own repayments" ON public.loan_repayments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all repayments" ON public.loan_repayments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Treasurers can view all repayments" ON public.loan_repayments FOR SELECT USING (has_role(auth.uid(), 'treasurer'::app_role));

-- Fines policies
CREATE POLICY "Users can view own fines" ON public.fines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all fines" ON public.fines FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert fines" ON public.fines FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update fines" ON public.fines FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Treasurers can view all fines" ON public.fines FOR SELECT USING (has_role(auth.uid(), 'treasurer'::app_role));
CREATE POLICY "Treasurers can insert fines" ON public.fines FOR INSERT WITH CHECK (has_role(auth.uid(), 'treasurer'::app_role));

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Chama settings policies
CREATE POLICY "Anyone can view settings" ON public.chama_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.chama_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert settings" ON public.chama_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- M-Pesa transactions policies
CREATE POLICY "Users can view own transactions" ON public.mpesa_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.mpesa_transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Treasurers can view all transactions" ON public.mpesa_transactions FOR SELECT USING (has_role(auth.uid(), 'treasurer'::app_role));
CREATE POLICY "System can insert transactions" ON public.mpesa_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update transactions" ON public.mpesa_transactions FOR UPDATE USING (true);

-- Insert default chama settings
INSERT INTO public.chama_settings (chama_name) VALUES ('My Chama');

-- Create triggers for updated_at
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chama_settings_updated_at BEFORE UPDATE ON public.chama_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mpesa_transactions_updated_at BEFORE UPDATE ON public.mpesa_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;