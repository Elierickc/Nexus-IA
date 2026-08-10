
-- Fix 1: Remove insecure public INSERT/UPDATE on payment_history
DROP POLICY IF EXISTS "Service role can insert payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Service role can update payment history" ON public.payment_history;

-- Fix 2: Remove client-writable UPDATE on user_credits
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- Fix 3: Add restrictive RLS to signup_tokens (deny all client access)
ALTER TABLE public.signup_tokens ENABLE ROW LEVEL SECURITY;

-- Ensure no SELECT policy exists (service role bypasses RLS)
-- No policies needed — service role handles all access
