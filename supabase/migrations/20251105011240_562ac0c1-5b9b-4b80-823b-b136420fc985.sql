-- Correção de segurança: Adicionar search_path às funções existentes

-- 1. Corrigir função check_profile_update
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow updates to display_name and cellphone
  -- All other fields must remain unchanged
  IF (NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id) OR
     (NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id) OR
     (NEW.plan IS DISTINCT FROM OLD.plan) OR
     (NEW.cpf IS DISTINCT FROM OLD.cpf) OR
     (NEW.tax_id IS DISTINCT FROM OLD.tax_id) OR
     (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
     (NEW.email IS DISTINCT FROM OLD.email) THEN
    RAISE EXCEPTION 'Cannot modify payment or identification fields';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Corrigir função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;