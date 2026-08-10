-- Create payment history table
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL,
  payment_method text NOT NULL,
  plan text,
  transaction_id text,
  payment_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payment history"
ON public.payment_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payment history"
ON public.payment_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update payment history"
ON public.payment_history
FOR UPDATE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();