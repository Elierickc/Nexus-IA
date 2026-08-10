-- Update RLS policy to allow users to create their own leads
DROP POLICY IF EXISTS "Sales and admin can create leads" ON crm_leads;

CREATE POLICY "Users can create their own leads"
ON crm_leads
FOR INSERT
WITH CHECK (owner_id = auth.uid());