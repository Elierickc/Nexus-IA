
-- Drop the old permissive deny policies (redundant now that RESTRICTIVE policies exist)
DROP POLICY IF EXISTS "Deny all select on signup_tokens" ON public.signup_tokens;
DROP POLICY IF EXISTS "Deny all insert on signup_tokens" ON public.signup_tokens;
DROP POLICY IF EXISTS "Deny all update on signup_tokens" ON public.signup_tokens;
DROP POLICY IF EXISTS "Deny all delete on signup_tokens" ON public.signup_tokens;
