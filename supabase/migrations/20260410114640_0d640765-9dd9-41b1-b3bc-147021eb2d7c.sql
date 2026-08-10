
-- Drop and recreate UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Finance can update invoice items on own invoices" ON public.finance_invoice_items;

CREATE POLICY "Finance can update invoice items on own invoices"
ON public.finance_invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
      AND (finance_invoices.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
      AND (finance_invoices.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);
