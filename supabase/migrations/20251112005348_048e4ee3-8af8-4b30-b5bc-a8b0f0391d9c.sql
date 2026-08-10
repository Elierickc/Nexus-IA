-- Enable realtime for crm_leads table
ALTER TABLE crm_leads REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE crm_leads;