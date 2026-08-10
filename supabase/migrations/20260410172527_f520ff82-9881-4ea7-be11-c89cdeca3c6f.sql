
-- Drop existing policies on finance_invoice_items
DROP POLICY IF EXISTS "Finance can insert invoice items on own invoices" ON public.finance_invoice_items;
DROP POLICY IF EXISTS "Finance can update invoice items on own invoices" ON public.finance_invoice_items;
DROP POLICY IF EXISTS "Finance can delete invoice items on own invoices" ON public.finance_invoice_items;

-- Recreate with aligned role checks (adding finance role to INSERT/UPDATE/DELETE)
CREATE POLICY "Finance can insert invoice items on own invoices"
ON public.finance_invoice_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
    AND (
      finance_invoices.created_by = auth.uid()
      OR has_role(auth.uid(), 'finance'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Finance can update invoice items on own invoices"
ON public.finance_invoice_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
    AND (
      finance_invoices.created_by = auth.uid()
      OR has_role(auth.uid(), 'finance'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
    AND (
      finance_invoices.created_by = auth.uid()
      OR has_role(auth.uid(), 'finance'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Finance can delete invoice items on own invoices"
ON public.finance_invoice_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM finance_invoices
    WHERE finance_invoices.id = finance_invoice_items.invoice_id
    AND (
      finance_invoices.created_by = auth.uid()
      OR has_role(auth.uid(), 'finance'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
