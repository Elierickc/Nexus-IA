import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

    // Check rate limit: 10 requests per minute for AI endpoints
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc("check_rate_limit", {
      _user_id: user.id,
      _endpoint: "suggest-features",
      _max_requests: 10,
      _window_seconds: 60,
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a minute before trying again." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check and deduct credit
    const { data: hasCredit, error: creditError } = await supabaseClient.rpc("deduct_credit", {
      user_id_param: user.id,
    });

    if (creditError) {
      console.error("Credit check error:", creditError);
      throw new Error("Failed to verify credits");
    }

    if (!hasCredit) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. Please upgrade your plan." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestBody = await req.json();
    
    // Validate input
    const validation = {
      projectDescription: requestBody.projectDescription,
      fullContext: requestBody.fullContext,
    };

    if (validation.projectDescription && typeof validation.projectDescription !== "string") {
      return new Response(
        JSON.stringify({ error: "Project description must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.projectDescription && validation.projectDescription.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Project description must be at least 10 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.projectDescription && validation.projectDescription.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Project description too long (maximum 2000 characters)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.fullContext && validation.fullContext.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Full context too long (maximum 10000 characters)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { projectDescription, fullContext } = validation;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware prompt
    let userPrompt = "";
    if (fullContext && fullContext.trim()) {
      const contextObj = JSON.parse(fullContext);
      userPrompt = `Analise o seguinte projeto SaaS:

Nome: ${contextObj.nome || 'Não informado'}
Descrição: ${contextObj.descricao || 'Não informado'}
Público-Alvo: ${contextObj.publicoAlvo || 'Não informado'}
Funcionalidades Principais: ${contextObj.funcionalidadesPrincipais || 'Não informado'}
Diferenciais: ${contextObj.diferenciais || 'Não informado'}

Com base nesse contexto detalhado, sugira 5 recursos complementares inovadores que agregariam valor ao projeto. Para cada recurso, forneça um título curto (máximo 5 palavras) e uma descrição de 2-3 linhas explicando como ele complementa as funcionalidades existentes. Retorne APENAS um array JSON válido no formato: [{"title": "...", "description": "..."}]`;
    } else {
      userPrompt = `Com base neste projeto: "${projectDescription}", sugira 5 recursos inovadores que agregariam valor. Para cada recurso, forneça um título curto (máximo 5 palavras) e uma descrição de 2-3 linhas. Retorne APENAS um array JSON válido no formato: [{"title": "...", "description": "..."}]`;
    }

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
            content: "Você é um especialista em sugerir funcionalidades complementares para aplicativos SaaS. Analise cuidadosamente o contexto fornecido e sugira recursos que realmente complementem e agreguem valor ao projeto. Seja específico e prático. SEMPRE retorne apenas um array JSON válido, sem texto adicional antes ou depois."
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
      throw new Error("Failed to generate suggestions");
    }

    const data = await response.json();
    let suggestions = data.choices[0].message.content;
    
    // Clean up common JSON wrapper issues
    suggestions = suggestions.trim();
    if (suggestions.startsWith("```json")) {
      suggestions = suggestions.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }
    if (suggestions.startsWith("```")) {
      suggestions = suggestions.replace(/```\n?/g, "");
    }
    
    // Try to parse as JSON, otherwise return as text
    let parsedSuggestions;
    try {
      parsedSuggestions = JSON.parse(suggestions.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw content:", suggestions);
      // If not JSON, create a simple structure
      parsedSuggestions = [{
        title: "Sugestões Geradas",
        description: suggestions
      }];
    }

    return new Response(JSON.stringify({ suggestions: parsedSuggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-features:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
