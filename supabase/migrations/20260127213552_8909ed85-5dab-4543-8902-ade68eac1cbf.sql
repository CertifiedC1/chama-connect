-- ===========================================
-- SECURITY HARDENING MIGRATION
-- Fix Critical RLS Vulnerabilities
-- ===========================================

-- 1. Fix mpesa_transactions: Remove overly permissive policies
-- These should only be modifiable via service role (edge functions)
DROP POLICY IF EXISTS "System can insert transactions" ON public.mpesa_transactions;
DROP POLICY IF EXISTS "System can update transactions" ON public.mpesa_transactions;

-- mpesa_transactions INSERT: Only authenticated users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
ON public.mpesa_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- mpesa_transactions UPDATE: Only admins/treasurers can update (for manual corrections)
CREATE POLICY "Admins can update transactions"
ON public.mpesa_transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Treasurers can update transactions"
ON public.mpesa_transactions
FOR UPDATE
USING (has_role(auth.uid(), 'treasurer'::app_role));

-- 2. Fix notifications: Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only admins/treasurers can create notifications for users
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Treasurers can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'treasurer'::app_role));

-- 3. Fix admin_access_logs: Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert logs" ON public.admin_access_logs;

-- Only admins can insert logs (or service role via edge functions)
CREATE POLICY "Admins can insert logs"
ON public.admin_access_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Remove duplicate lockout policy
DROP POLICY IF EXISTS "Users can view own lockout status" ON public.admin_lockouts;
-- Keep "Users can view their own lockout status" policy

-- 5. Restrict chama_settings to authenticated users only (not public)
DROP POLICY IF EXISTS "Anyone can view settings" ON public.chama_settings;

CREATE POLICY "Authenticated users can view settings"
ON public.chama_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);