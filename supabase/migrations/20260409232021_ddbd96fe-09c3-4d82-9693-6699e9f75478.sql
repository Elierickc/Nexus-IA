-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Finance can manage invoice items" ON public.finance_invoice_items;

-- INSERT: only on invoices the user created (or admin)
CREATE POLICY "Finance can insert invoice items on own invoices"
ON public.finance_invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
      AND (finance_invoices.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- UPDATE: only on invoices the user created (or admin)
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
);

-- DELETE: only on invoices the user created (or admin)
CREATE POLICY "Finance can delete invoice items on own invoices"
ON public.finance_invoice_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
      AND (finance_invoices.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);