-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a function to check if only safe fields are being updated
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow updates to display_name and cellphone
  -- All other fields must remain unchanged
  IF (NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id) OR
     (NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id) OR
     (NEW.plan IS DISTINCT FROM OLD.plan) OR
     (NEW.cpf IS DISTINCT FROM OLD.cpf) OR
     (NEW.tax_id IS DISTINCT FROM OLD.tax_id) OR
     (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
     (NEW.email IS DISTINCT FROM OLD.email) THEN
    RAISE EXCEPTION 'Cannot modify payment or identification fields';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce safe updates
DROP TRIGGER IF EXISTS enforce_safe_profile_updates ON public.profiles;
CREATE TRIGGER enforce_safe_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update();

-- Create simple UPDATE policy
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Add missing UPDATE policy for leads table
CREATE POLICY "Users can update their own leads" ON public.leads
FOR UPDATE
USING (auth.uid() = user_id);