import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check rate limit: 20 requests per hour
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc("check_rate_limit", {
      _user_id: user.id,
      _endpoint: "generate-whatsapp-message",
      _max_requests: 20,
      _window_seconds: 3600,
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns minutos." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { businessName, businessType } = await req.json();
    
    if (!businessName) {
      return new Response(
        JSON.stringify({ error: "Nome do negócio é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Crie uma mensagem de abordagem de vendas curta e profissional para WhatsApp oferecendo serviços de desenvolvimento de aplicativos para o negócio "${businessName}"${businessType ? ` do setor ${businessType}` : ''}. 

IMPORTANTE:
- Use o nome "${businessName}" diretamente na mensagem (não use placeholders como [Nome do Cliente])
- Seja específico sobre como um aplicativo pode beneficiar este tipo de negócio
- Máximo 3-4 linhas
- Tom amigável mas profissional
- Sem emojis excessivos
- Termine com uma pergunta para engajar

Retorne APENAS o texto da mensagem pronta para envio, sem aspas ou formatação adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em vendas que cria mensagens persuasivas mas respeitosas para WhatsApp. Suas mensagens são curtas, diretas e profissionais."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI gateway error:", response.status, error);
      throw new Error("Falha ao gerar mensagem");
    }

    const data = await response.json();
    const message = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-whatsapp-message:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
