-- Create contributions table
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  contribution_type TEXT NOT NULL DEFAULT 'monthly',
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  mpesa_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contributions
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for contributions
CREATE POLICY "Users can view own contributions"
ON public.contributions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributions"
ON public.contributions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all contributions"
ON public.contributions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Treasurers can view all contributions"
ON public.contributions
FOR SELECT
USING (has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can update any contribution"
ON public.contributions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Treasurers can update any contribution"
ON public.contributions
FOR UPDATE
USING (has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete contributions"
ON public.contributions
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on contributions
CREATE TRIGGER update_contributions_updated_at
BEFORE UPDATE ON public.contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for contributions
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;