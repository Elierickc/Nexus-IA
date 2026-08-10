-- =====================================================
-- FOUNDATION: Sistema de Permissões e Auditoria
-- =====================================================

-- 1. Enum de Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'sales', 'finance', 'manager', 'support', 'viewer');

-- 2. Tabela de Roles (múltiplos roles por usuário)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar roles (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Feature Flags (ativar/desativar módulos)
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their feature flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- 4. Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'manager')
);

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- CRM: Tabelas principais
-- =====================================================

-- 5. CRM Tags (para segmentação)
CREATE TABLE public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(name, user_id)
);

ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tags"
ON public.crm_tags FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 6. CRM Accounts (Empresas)
CREATE TABLE public.crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  annual_revenue NUMERIC(15,2),
  phone TEXT,
  address JSONB,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible accounts"
ON public.crm_accounts FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Sales and admin can create accounts"
ON public.crm_accounts FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Owners and admins can update accounts"
ON public.crm_accounts FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete accounts"
ON public.crm_accounts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger de auditoria para accounts
CREATE TRIGGER audit_crm_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.crm_accounts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 7. CRM Contacts (Contatos)
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  emails JSONB DEFAULT '[]'::jsonb,
  phones JSONB DEFAULT '[]'::jsonb,
  position TEXT,
  address JSONB,
  notes TEXT,
  tags TEXT[],
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible contacts"
ON public.crm_contacts FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Sales and admin can create contacts"
ON public.crm_contacts FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Owners and admins can update contacts"
ON public.crm_contacts FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete contacts"
ON public.crm_contacts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_crm_contacts
AFTER INSERT OR UPDATE OR DELETE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 8. CRM Leads
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  notes TEXT,
  converted_contact_id UUID REFERENCES public.crm_contacts(id),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible leads"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Sales and admin can create leads"
ON public.crm_leads FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Owners and admins can update leads"
ON public.crm_leads FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete leads"
ON public.crm_leads FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_crm_leads
AFTER INSERT OR UPDATE OR DELETE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 9. CRM Deals (Oportunidades/Pipeline)
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  stage TEXT NOT NULL DEFAULT 'prospect',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  close_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason TEXT,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible deals"
ON public.crm_deals FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Sales and admin can create deals"
ON public.crm_deals FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Owners and admins can update deals"
ON public.crm_deals FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete deals"
ON public.crm_deals FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_crm_deals
AFTER INSERT OR UPDATE OR DELETE ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 10. CRM Activities (Atividades/Tarefas)
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'task', 'deadline')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their activities"
ON public.crm_activities FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Users can create activities"
ON public.crm_activities FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Assigned users can update activities"
ON public.crm_activities FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Creators and admins can delete activities"
ON public.crm_activities FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER audit_crm_activities
AFTER INSERT OR UPDATE OR DELETE ON public.crm_activities
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 11. CRM Email Templates
CREATE TABLE public.crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their templates"
ON public.crm_email_templates FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- =====================================================
-- FINANCE: Tabelas principais
-- =====================================================

-- 12. Finance Chart of Accounts (Plano de Contas)
CREATE TABLE public.finance_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES public.finance_chart_of_accounts(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(code, user_id)
);

ALTER TABLE public.finance_chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can manage chart of accounts"
ON public.finance_chart_of_accounts FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

-- 13. Finance Invoices (Faturas)
CREATE TABLE public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  payment_link TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(invoice_number, created_by)
);

ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible invoices"
ON public.finance_invoices FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Finance and sales can create invoices"
ON public.finance_invoices FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Finance and creators can update invoices"
ON public.finance_invoices FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Finance and admin can delete invoices"
ON public.finance_invoices FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER audit_finance_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.finance_invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 14. Finance Invoice Items
CREATE TABLE public.finance_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.finance_invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items"
ON public.finance_invoice_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.finance_invoices
    WHERE id = invoice_id
    AND (
      created_by = auth.uid()
      OR public.has_role(auth.uid(), 'finance')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
    )
  )
);

CREATE POLICY "Finance can manage invoice items"
ON public.finance_invoice_items FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'admin')
);

-- 15. Finance Payments
CREATE TABLE public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  gateway_data JSONB,
  recorded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can view payments"
ON public.finance_payments FOR SELECT
TO authenticated
USING (
  recorded_by = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Finance can create payments"
ON public.finance_payments FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Finance and admin can update payments"
ON public.finance_payments FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin can delete payments"
ON public.finance_payments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_finance_payments
AFTER INSERT OR UPDATE OR DELETE ON public.finance_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 16. Finance Expenses (Despesas)
CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  account_id UUID REFERENCES public.finance_chart_of_accounts(id),
  receipt_url TEXT,
  notes TEXT,
  tags TEXT[],
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can view expenses"
ON public.finance_expenses FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Users can create expenses"
ON public.finance_expenses FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Finance can update expenses"
ON public.finance_expenses FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin can delete expenses"
ON public.finance_expenses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER audit_finance_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.finance_expenses
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 17. Finance Bank Transactions (Transações Bancárias)
CREATE TABLE public.finance_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  balance NUMERIC(15,2),
  reconciled BOOLEAN DEFAULT false,
  matched_invoice_id UUID REFERENCES public.finance_invoices(id),
  matched_expense_id UUID REFERENCES public.finance_expenses(id),
  notes TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.finance_bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can manage bank transactions"
ON public.finance_bank_transactions FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'admin')
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

CREATE INDEX idx_crm_contacts_owner ON public.crm_contacts(owner_id);
CREATE INDEX idx_crm_contacts_account ON public.crm_contacts(account_id);
CREATE INDEX idx_crm_contacts_tags ON public.crm_contacts USING GIN(tags);

CREATE INDEX idx_crm_accounts_owner ON public.crm_accounts(owner_id);

CREATE INDEX idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);

CREATE INDEX idx_crm_deals_owner ON public.crm_deals(owner_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX idx_crm_deals_status ON public.crm_deals(status);

CREATE INDEX idx_crm_activities_assigned ON public.crm_activities(assigned_to);
CREATE INDEX idx_crm_activities_contact ON public.crm_activities(contact_id);
CREATE INDEX idx_crm_activities_deal ON public.crm_activities(deal_id);
CREATE INDEX idx_crm_activities_due_date ON public.crm_activities(due_date);

CREATE INDEX idx_finance_invoices_client ON public.finance_invoices(client_id);
CREATE INDEX idx_finance_invoices_status ON public.finance_invoices(status);
CREATE INDEX idx_finance_invoices_due_date ON public.finance_invoices(due_date);
CREATE INDEX idx_finance_invoices_creator ON public.finance_invoices(created_by);

CREATE INDEX idx_finance_payments_invoice ON public.finance_payments(invoice_id);

CREATE INDEX idx_finance_expenses_creator ON public.finance_expenses(created_by);
CREATE INDEX idx_finance_expenses_date ON public.finance_expenses(expense_date);

CREATE INDEX idx_finance_bank_transactions_user ON public.finance_bank_transactions(user_id);
CREATE INDEX idx_finance_bank_transactions_date ON public.finance_bank_transactions(transaction_date);

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_accounts_updated_at
BEFORE UPDATE ON public.crm_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at
BEFORE UPDATE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at
BEFORE UPDATE ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_activities_updated_at
BEFORE UPDATE ON public.crm_activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_email_templates_updated_at
BEFORE UPDATE ON public.crm_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_invoices_updated_at
BEFORE UPDATE ON public.finance_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_expenses_updated_at
BEFORE UPDATE ON public.finance_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();