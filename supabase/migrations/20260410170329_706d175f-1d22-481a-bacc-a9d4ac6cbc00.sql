
-- Re-create the dropped policies as RESTRICTIVE (AS RESTRICTIVE must come before FOR)
CREATE POLICY "Restrict all select on signup_tokens"
ON public.signup_tokens AS RESTRICTIVE
FOR SELECT TO authenticated, anon
USING (false);

CREATE POLICY "Restrict all insert on signup_tokens"
ON public.signup_tokens AS RESTRICTIVE
FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Restrict all update on signup_tokens"
ON public.signup_tokens AS RESTRICTIVE
FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Restrict all delete on signup_tokens"
ON public.signup_tokens AS RESTRICTIVE
FOR DELETE TO authenticated, anon
USING (false);
