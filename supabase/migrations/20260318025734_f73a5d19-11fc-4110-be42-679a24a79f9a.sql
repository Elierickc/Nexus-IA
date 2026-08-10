-- Allow admins to view ALL payment_history records
CREATE POLICY "Admins can view all payment history"
ON public.payment_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
