-- Fix: Always assign 'member' role on signup - prevent privilege escalation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')
  );
  
  -- SECURITY FIX: Always assign 'member' role - admins must be promoted manually by existing admins
  -- Ignoring any requested_role from user metadata to prevent privilege escalation
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member'::app_role);
  
  RETURN NEW;
END;
$$;

-- Fix: Remove permissive policy on admin_lockouts
DROP POLICY IF EXISTS "System can manage lockouts" ON admin_lockouts;

-- No user should be able to directly access admin_lockouts - managed via edge function only
-- Only allow admins to read their own lockout status (for UI display)
CREATE POLICY "Users can view their own lockout status"
ON admin_lockouts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);