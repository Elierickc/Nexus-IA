-- Allow users to update their own copy_texts
CREATE POLICY "Users can update their own copy texts"
ON public.copy_texts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add RESTRICTIVE policy on user_roles to ensure only admins can ever insert/update/delete roles,
-- regardless of any future permissive policies that might be added.
CREATE POLICY "Restrict role inserts to admins"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Restrict role updates to admins"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Restrict role deletes to admins"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));