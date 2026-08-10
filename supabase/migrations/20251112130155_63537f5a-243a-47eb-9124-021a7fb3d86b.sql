-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'cancelled', 'overdue');

-- Create subscriptions table
CREATE TABLE public.finance_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  contact_id UUID REFERENCES public.crm_contacts(id),
  plan_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL,
  last_billing_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscriptions" 
ON public.finance_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.finance_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.finance_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON public.finance_subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_finance_subscriptions_updated_at
BEFORE UPDATE ON public.finance_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_finance_subscriptions_user_id ON public.finance_subscriptions(user_id);
CREATE INDEX idx_finance_subscriptions_next_billing_date ON public.finance_subscriptions(next_billing_date);
CREATE INDEX idx_finance_subscriptions_status ON public.finance_subscriptions(status);