-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- The service role automatically bypasses RLS, so we don't need a policy for it.
-- The existing "Users can view their own rate limits" policy is correct.

-- Verify RLS is enabled (it should already be, but just in case)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well (extra security)
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;