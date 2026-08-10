
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(period_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  start_current timestamptz := now() - (period_days || ' days')::interval;
  start_prev timestamptz := now() - (period_days * 2 || ' days')::interval;
  leads_cur int; leads_prev int;
  convs_cur int; convs_prev int;
  responses_cur int; responses_prev int;
  meetings_cur int; meetings_prev int;
  proposals_cur int; proposals_prev int;
  won_cur int; won_prev int;
  revenue_cur numeric; revenue_prev numeric;
  weekly jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error','unauthenticated');
  END IF;

  SELECT count(*) INTO leads_cur FROM crm_leads WHERE owner_id=uid AND created_at >= start_current;
  SELECT count(*) INTO leads_prev FROM crm_leads WHERE owner_id=uid AND created_at >= start_prev AND created_at < start_current;

  SELECT count(*) INTO convs_cur FROM whatsapp_conversations WHERE user_id=uid AND created_at >= start_current;
  SELECT count(*) INTO convs_prev FROM whatsapp_conversations WHERE user_id=uid AND created_at >= start_prev AND created_at < start_current;

  SELECT count(*) INTO responses_cur FROM whatsapp_messages m
    JOIN whatsapp_conversations c ON c.id=m.conversation_id
    WHERE c.user_id=uid AND m.direction='inbound' AND m.created_at >= start_current;
  SELECT count(*) INTO responses_prev FROM whatsapp_messages m
    JOIN whatsapp_conversations c ON c.id=m.conversation_id
    WHERE c.user_id=uid AND m.direction='inbound' AND m.created_at >= start_prev AND m.created_at < start_current;

  SELECT count(*) INTO meetings_cur FROM crm_deals WHERE owner_id=uid AND stage IN ('meeting','meeting_scheduled','qualification') AND updated_at >= start_current;
  SELECT count(*) INTO meetings_prev FROM crm_deals WHERE owner_id=uid AND stage IN ('meeting','meeting_scheduled','qualification') AND updated_at >= start_prev AND updated_at < start_current;

  SELECT count(*) INTO proposals_cur FROM crm_deals WHERE owner_id=uid AND stage IN ('proposal','negotiation') AND updated_at >= start_current;
  SELECT count(*) INTO proposals_prev FROM crm_deals WHERE owner_id=uid AND stage IN ('proposal','negotiation') AND updated_at >= start_prev AND updated_at < start_current;

  SELECT count(*), COALESCE(sum(value),0) INTO won_cur, revenue_cur FROM crm_deals
    WHERE owner_id=uid AND status='won' AND updated_at >= start_current;
  SELECT count(*), COALESCE(sum(value),0) INTO won_prev, revenue_prev FROM crm_deals
    WHERE owner_id=uid AND status='won' AND updated_at >= start_prev AND updated_at < start_current;

  SELECT jsonb_agg(jsonb_build_object('week', to_char(wk,'DD/MM'), 'leads', leads, 'won', won, 'revenue', revenue) ORDER BY wk)
  INTO weekly
  FROM (
    SELECT date_trunc('week', g.wk) AS wk,
      (SELECT count(*) FROM crm_leads WHERE owner_id=uid AND created_at >= g.wk AND created_at < g.wk + interval '7 days') AS leads,
      (SELECT count(*) FROM crm_deals WHERE owner_id=uid AND status='won' AND updated_at >= g.wk AND updated_at < g.wk + interval '7 days') AS won,
      (SELECT COALESCE(sum(value),0) FROM crm_deals WHERE owner_id=uid AND status='won' AND updated_at >= g.wk AND updated_at < g.wk + interval '7 days') AS revenue
    FROM generate_series(date_trunc('week', now() - interval '7 weeks'), date_trunc('week', now()), interval '1 week') AS g(wk)
  ) s;

  RETURN jsonb_build_object(
    'leads', jsonb_build_object('current', leads_cur, 'previous', leads_prev),
    'conversations', jsonb_build_object('current', convs_cur, 'previous', convs_prev),
    'responses', jsonb_build_object('current', responses_cur, 'previous', responses_prev),
    'meetings', jsonb_build_object('current', meetings_cur, 'previous', meetings_prev),
    'proposals', jsonb_build_object('current', proposals_cur, 'previous', proposals_prev),
    'won', jsonb_build_object('current', won_cur, 'previous', won_prev),
    'revenue', jsonb_build_object('current', revenue_cur, 'previous', revenue_prev),
    'weekly', COALESCE(weekly, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(integer) TO authenticated;
