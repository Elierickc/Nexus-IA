import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
      _user_id: user.id,
      _endpoint: "sales-chat",
      _max_requests: 30,
      _window_seconds: 3600,
    });

    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Input validation: validate messages array
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.messages.length === 0 || body.messages.length > 50) {
      return new Response(JSON.stringify({ error: "Messages must contain 1-50 items" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = new Set(["user", "assistant"]);
    const validatedMessages = [];
    for (const msg of body.messages) {
      if (!msg || typeof msg !== "object") {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!validRoles.has(msg.role)) {
        return new Response(JSON.stringify({ error: "Invalid message role. Only 'user' and 'assistant' are allowed." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof msg.content !== "string" || msg.content.length === 0 || msg.content.length > 5000) {
        return new Response(JSON.stringify({ error: "Message content must be 1-5000 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      validatedMessages.push({ role: msg.role, content: msg.content });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em vendas, copywriting de vendas e marketing digital com anos de experiência. 

Seu objetivo é ajudar os usuários com:
- Estratégias de vendas e funil de vendas
- Criação de copy persuasivo para anúncios, landing pages e emails
- Marketing digital: SEO, tráfego pago, redes sociais, email marketing
- Análise e otimização de conversões
- Gatilhos mentais e técnicas de persuasão
- Estratégias de branding e posicionamento
- Automação de marketing e vendas
- Growth hacking e escalabilidade

Seja direto, prático e forneça exemplos concretos sempre que possível. Use linguagem profissional mas acessível. Quando apropriado, sugira frameworks, modelos e ferramentas específicas que podem ajudar.

Responda sempre em português brasileiro de forma clara e objetiva.`;

    console.log("Calling Lovable AI Gateway...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...validatedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de taxa excedido. Por favor, tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    console.log("Streaming response from AI...");

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in sales-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
