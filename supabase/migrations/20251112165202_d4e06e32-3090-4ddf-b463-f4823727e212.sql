-- Add subscription_end column to user_credits table
ALTER TABLE public.user_credits 
ADD COLUMN subscription_end TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of expiring subscriptions
CREATE INDEX idx_user_credits_subscription_end 
ON public.user_credits(subscription_end) 
WHERE subscription_end IS NOT NULL;

-- Add column to track last reminder sent
ALTER TABLE public.user_credits 
ADD COLUMN last_reminder_sent TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.user_credits.subscription_end IS 'Data de término da assinatura ativa do usuário';
COMMENT ON COLUMN public.user_credits.last_reminder_sent IS 'Data do último lembrete de vencimento enviado ao usuário';