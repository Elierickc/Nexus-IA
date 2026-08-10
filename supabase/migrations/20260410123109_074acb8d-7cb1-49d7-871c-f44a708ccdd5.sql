
-- Add explicit deny-all policies on signup_tokens for clarity
CREATE POLICY "Deny all select on signup_tokens"
ON public.signup_tokens FOR SELECT TO authenticated, anon
USING (false);

CREATE POLICY "Deny all insert on signup_tokens"
ON public.signup_tokens FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny all update on signup_tokens"
ON public.signup_tokens FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Deny all delete on signup_tokens"
ON public.signup_tokens FOR DELETE TO authenticated, anon
USING (false);

-- Protect audit_logs against direct writes (trigger uses SECURITY DEFINER to bypass)
CREATE POLICY "Deny direct insert on audit_logs"
ON public.audit_logs FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny direct update on audit_logs"
ON public.audit_logs FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Deny direct delete on audit_logs"
ON public.audit_logs FOR DELETE TO authenticated, anon
USING (false);
