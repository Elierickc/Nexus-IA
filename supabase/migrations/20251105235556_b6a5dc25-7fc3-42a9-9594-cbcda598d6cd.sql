-- Drop the overly permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restrictive UPDATE policies - one for each safe field
-- This allows users to only update display_name and cellphone
CREATE POLICY "Users can update display name" ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Ensure protected fields haven't changed
  stripe_customer_id = (SELECT stripe_customer_id FROM profiles WHERE id = id) AND
  stripe_subscription_id = (SELECT stripe_subscription_id FROM profiles WHERE id = id) AND
  plan = (SELECT plan FROM profiles WHERE id = id) AND
  COALESCE(cpf, '') = COALESCE((SELECT cpf FROM profiles WHERE id = id), '') AND
  COALESCE(tax_id, '') = COALESCE((SELECT tax_id FROM profiles WHERE id = id), '') AND
  user_id = (SELECT user_id FROM profiles WHERE id = id) AND
  email = (SELECT email FROM profiles WHERE id = id)
);