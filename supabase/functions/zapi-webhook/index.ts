import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zapi-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Webhook authentication: verify shared secret token
    const webhookToken = req.headers.get('x-zapi-token') || new URL(req.url).searchParams.get('token');
    const expectedToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

    if (!expectedToken) {
      console.error("ZAPI_CLIENT_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!webhookToken || webhookToken !== expectedToken) {
      console.error("Invalid or missing webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Z-API webhook received (authenticated)");

    // Z-API sends different event types
    const isMessage = body.event === "message" || body.text || body.body;
    if (!isMessage) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract message data from Z-API payload
    const rawPhone = (body.phone || body.from || "");
    const senderPhone = rawPhone.replace(/\D/g, '').slice(0, 15);
    const rawText = body.text?.message || body.body || body.message || "";
    const messageText = typeof rawText === "string" ? rawText.slice(0, 5000) : "";
    const rawName = body.senderName || body.chatName || senderPhone;
    const senderName = typeof rawName === "string" ? rawName.slice(0, 100) : senderPhone;
    const zapiMessageId = body.messageId || body.id || null;

    if (!senderPhone || senderPhone.length < 10 || !messageText) {
      console.log("Invalid phone or empty message, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find existing conversation for this phone
    const { data: conversations } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select("*")
      .eq("contact_phone", senderPhone)
      .eq("status", "active")
      .limit(1);

    let conversation = conversations?.[0];

    // If no conversation exists, create one
    if (!conversation) {
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "sales"])
        .limit(1);

      const assignUserId = adminRoles?.[0]?.user_id;
      if (!assignUserId) {
        console.error("No admin/sales user found to assign conversation");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newConv, error: convError } = await supabaseAdmin
        .from("whatsapp_conversations")
        .insert({
          user_id: assignUserId,
          contact_phone: senderPhone,
          contact_name: senderName,
          status: "active",
          ai_enabled: true,
        })
        .select()
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        throw convError;
      }
      conversation = newConv;
    }

    // Save incoming message
    await supabaseAdmin.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      direction: "incoming",
      content: messageText,
      message_type: "text",
      status: "received",
      zapi_message_id: zapiMessageId,
    });

    // If AI is enabled, generate and send auto-reply
    if (conversation.ai_enabled) {
      const { data: history } = await supabaseAdmin
        .from("whatsapp_messages")
        .select("direction, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(20);

      const conversationHistory = (history || []).map(m => ({
        role: m.direction === "incoming" ? "user" : "assistant",
        content: m.content,
      }));

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured, skipping AI reply");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `Você é um assistente de vendas especializado. Seu objetivo é:
1. Ser cordial e profissional
2. Entender a necessidade do cliente
3. Apresentar soluções relevantes
4. Convencer o cliente a comprar nossos serviços/produtos
5. Quando o cliente demonstrar interesse real em comprar, responda incluindo a frase exata "[INTERESSE_COMPRA]" no final da sua mensagem

REGRAS:
- Mensagens curtas e diretas (máximo 3-4 linhas)
- Tom amigável mas profissional
- Não seja agressivo nas vendas
- Faça perguntas para entender a necessidade
- Quando identificar intenção de compra clara (cliente pede preço, quer saber como contratar, pede proposta), inclua [INTERESSE_COMPRA]
- NUNCA mostre o marcador [INTERESSE_COMPRA] ao cliente, ele é apenas para uso interno

Nome do cliente: ${conversation.contact_name || "Cliente"}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI error:", aiResponse.status, await aiResponse.text());
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      let aiMessage = aiData.choices[0].message.content.trim();

      // Check for purchase intent
      const hasPurchaseIntent = aiMessage.includes("[INTERESSE_COMPRA]");
      aiMessage = aiMessage.replace("[INTERESSE_COMPRA]", "").trim();

      // If purchase intent detected, update conversation and create CRM lead
      if (hasPurchaseIntent && !conversation.purchase_intent) {
        await supabaseAdmin
          .from("whatsapp_conversations")
          .update({ purchase_intent: true })
          .eq("id", conversation.id);

        const { data: newLead } = await supabaseAdmin
          .from("crm_leads")
          .insert({
            name: conversation.contact_name || senderPhone,
            phone: senderPhone,
            owner_id: conversation.user_id,
            source: "whatsapp_ai",
            status: "qualified",
            notes: `Cliente demonstrou interesse de compra via WhatsApp automático.`,
          })
          .select()
          .single();

        if (newLead) {
          await supabaseAdmin
            .from("whatsapp_conversations")
            .update({ crm_lead_id: newLead.id })
            .eq("id", conversation.id);
        }

        console.log("Purchase intent detected! CRM lead created:", newLead?.id);
      }

      // Send AI reply via Z-API
      const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
      const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
      const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

      if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
        const sendResponse = await fetch(
          `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
            },
            body: JSON.stringify({
              phone: senderPhone,
              message: aiMessage,
            }),
          }
        );

        const sendData = await sendResponse.json();

        await supabaseAdmin.from("whatsapp_messages").insert({
          conversation_id: conversation.id,
          direction: "outgoing",
          content: aiMessage,
          message_type: "text",
          status: sendResponse.ok ? "sent" : "failed",
          zapi_message_id: sendData.messageId || null,
          metadata: { ai_generated: true, purchase_intent: hasPurchaseIntent },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in zapi-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
