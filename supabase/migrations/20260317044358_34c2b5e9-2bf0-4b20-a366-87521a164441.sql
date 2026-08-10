
-- Fix 1: Replace fragile profiles UPDATE policy with simple one + trigger protection
DROP POLICY IF EXISTS "Users can update display name" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- The check_profile_update trigger already exists and prevents modification of sensitive fields
-- Ensure the trigger is attached
DROP TRIGGER IF EXISTS check_profile_update_trigger ON public.profiles;
CREATE TRIGGER check_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update();

-- Fix 3: Create signup_tokens table for secure payment flow
CREATE TABLE IF NOT EXISTS public.signup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  plan_id text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- No RLS needed - only accessed by edge functions with service role key
ALTER TABLE public.signup_tokens ENABLE ROW LEVEL SECURITY;
