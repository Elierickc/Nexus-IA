import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
      _endpoint: "generate-sales-approach",
      _max_requests: 10,
      _window_seconds: 3600,
    });

    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      companyName, 
      businessType, 
      pain, 
      solution,
      productName,
      targetPerson 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é um especialista em vendas B2B e copywriting. Sua missão é criar uma sequência completa de mensagens de prospecção e vendas para WhatsApp, com análise de sentimento detalhada.

IMPORTANTE: Gere mensagens CURTAS e DIRETAS para WhatsApp. Máximo 3-4 linhas por mensagem.

Crie mensagens para as seguintes etapas:
1. PRIMEIRO CONTATO (quebrando o gelo, apresentação rápida)
2. QUALIFICAÇÃO (identificar dor/necessidade)
3. APRESENTAÇÃO DA SOLUÇÃO (mostrar valor)
4. PROPOSTA (oferta concreta)
5. NEGOCIAÇÃO (lidar com objeções)
6. FECHAMENTO (call to action final)

Para cada etapa, forneça:
- Título da etapa
- 2-3 variações de mensagem
- **ANÁLISE DE TOM**: Para cada mensagem, analise e indique:
  * Tom detectado (Profissional, Casual, Urgente, Consultivo, Amigável)
  * Nível de formalidade (1-5, onde 1=muito casual, 5=muito formal)
  * Nível de urgência (1-5, onde 1=sem urgência, 5=muito urgente)
  * Adequação ao contexto (✅ adequado ou ⚠️ precisa ajuste)
- **SUGESTÕES DE AJUSTE**: Se o tom não for ideal, sugira como melhorar
- Dica de quando usar cada variação
- Próximo passo sugerido

FORMATO DA ANÁLISE (para cada mensagem):
📊 **Análise de Tom:**
- Tom: [tipo]
- Formalidade: [nível]/5
- Urgência: [nível]/5
- Adequação: [emoji + descrição]
💡 **Sugestões:** [se necessário]`;

    const userPrompt = `Crie uma abordagem de vendas completa para:

EMPRESA: ${companyName}
TIPO DE NEGÓCIO: ${businessType}
DOR/PROBLEMA: ${pain}
NOSSA SOLUÇÃO: ${solution}
PRODUTO/SERVIÇO: ${productName}
CONTATO ALVO: ${targetPerson || "Decisor da empresa"}

Gere mensagens naturais, conversacionais e persuasivas. Use emojis moderadamente. Foque em valor e benefícios.

IMPORTANTE: Para cada mensagem, inclua a análise de tom completa e sugestões de ajuste caso o tom não esteja adequado ao contexto de vendas B2B.`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace do Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro na API de IA:", response.status, errorText);
      throw new Error("Erro ao gerar abordagem");
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ approach: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro em generate-sales-approach:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
