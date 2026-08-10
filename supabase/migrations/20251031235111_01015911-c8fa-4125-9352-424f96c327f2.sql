-- Fix search_path for reset_monthly_credits function
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
  SET 
    credits = CASE 
      WHEN plan = 'free' THEN 5
      WHEN plan = 'pro' THEN 100
      WHEN plan = 'enterprise' THEN 9999
    END,
    last_reset_at = now(),
    updated_at = now()
  WHERE 
    EXTRACT(EPOCH FROM (now() - last_reset_at)) > 2592000;
END;
$$;