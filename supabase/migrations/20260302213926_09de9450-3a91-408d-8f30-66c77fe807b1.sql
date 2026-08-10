
-- Table for WhatsApp conversations
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'active',
  ai_enabled boolean NOT NULL DEFAULT true,
  crm_lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  crm_contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  purchase_intent boolean NOT NULL DEFAULT false,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their conversations"
  ON public.whatsapp_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their conversations"
  ON public.whatsapp_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Table for WhatsApp messages
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outgoing',
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'pending',
  zapi_message_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their conversations"
  ON public.whatsapp_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations
    WHERE whatsapp_conversations.id = whatsapp_messages.conversation_id
    AND whatsapp_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations
    WHERE whatsapp_conversations.id = whatsapp_messages.conversation_id
    AND whatsapp_conversations.user_id = auth.uid()
  ));

-- Table for bulk message campaigns
CREATE TABLE public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  message_template text NOT NULL,
  target_phones text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);

ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their campaigns"
  ON public.whatsapp_campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;

-- Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_whatsapp_message
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();
