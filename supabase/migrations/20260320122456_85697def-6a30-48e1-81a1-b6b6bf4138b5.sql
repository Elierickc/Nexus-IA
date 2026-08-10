
-- Delete all data related to free plan users
-- First get the user_ids
DO $$
DECLARE
  free_user_ids uuid[];
BEGIN
  SELECT array_agg(user_id) INTO free_user_ids
  FROM public.user_credits
  WHERE plan = 'free';

  IF free_user_ids IS NOT NULL THEN
    -- Delete from all related public tables
    DELETE FROM public.whatsapp_messages WHERE conversation_id IN (SELECT id FROM public.whatsapp_conversations WHERE user_id = ANY(free_user_ids));
    DELETE FROM public.whatsapp_conversations WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.whatsapp_campaigns WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.ticket_comments WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.support_tickets WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.copy_texts WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.feature_suggestions WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.landing_pages WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.leads WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.projects WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.payment_history WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.crm_activities WHERE assigned_to = ANY(free_user_ids) OR created_by = ANY(free_user_ids);
    DELETE FROM public.finance_invoice_items WHERE invoice_id IN (SELECT id FROM public.finance_invoices WHERE created_by = ANY(free_user_ids));
    DELETE FROM public.finance_payments WHERE recorded_by = ANY(free_user_ids);
    DELETE FROM public.finance_invoices WHERE created_by = ANY(free_user_ids);
    DELETE FROM public.finance_expenses WHERE created_by = ANY(free_user_ids);
    DELETE FROM public.finance_bank_transactions WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.finance_chart_of_accounts WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.finance_subscriptions WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.crm_deals WHERE owner_id = ANY(free_user_ids);
    DELETE FROM public.crm_leads WHERE owner_id = ANY(free_user_ids);
    DELETE FROM public.crm_contacts WHERE owner_id = ANY(free_user_ids);
    DELETE FROM public.crm_accounts WHERE owner_id = ANY(free_user_ids);
    DELETE FROM public.crm_email_templates WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.crm_tags WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.feature_flags WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.rate_limits WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.user_roles WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.user_credits WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.profiles WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.audit_logs WHERE user_id = ANY(free_user_ids);
    DELETE FROM public.signup_tokens WHERE email IN (SELECT email FROM public.profiles WHERE user_id = ANY(free_user_ids));
    
    -- Delete from auth.users (cascade will handle auth schema internals)
    DELETE FROM auth.users WHERE id = ANY(free_user_ids);
  END IF;
END $$;
