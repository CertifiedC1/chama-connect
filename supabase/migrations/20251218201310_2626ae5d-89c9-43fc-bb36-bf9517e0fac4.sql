-- Create admin_access_logs table for security logging
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view access logs"
ON public.admin_access_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert logs (service role)
CREATE POLICY "Service role can insert logs"
ON public.admin_access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create admin_lockouts table to track failed attempts
CREATE TABLE IF NOT EXISTS public.admin_lockouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lockout status"
ON public.admin_lockouts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can manage lockouts"
ON public.admin_lockouts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);