-- Update the handle_new_user function to respect the requested role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role app_role;
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')
  );
  
  -- Get the requested role from user metadata, default to 'member' if not specified
  requested_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'requested_role')::app_role,
    'member'::app_role
  );
  
  -- Assign the requested role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role);
  
  RETURN NEW;
END;
$$;