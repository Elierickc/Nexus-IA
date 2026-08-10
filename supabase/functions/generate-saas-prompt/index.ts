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
      _endpoint: "generate-saas-prompt",
      _max_requests: 10,
      _window_seconds: 3600,
    });

    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const projectInfo = `
Nome do Projeto: ${formData.projectName || 'Não informado'}
Função Principal: ${formData.mainFunction || 'Não informado'}
Público-alvo: ${formData.targetAudience || 'Não informado'}
Transformação: ${formData.transformation || 'Não informado'}
Peça Central: ${formData.centerpiece || 'Não informado'}
Momento Mágico: ${formData.magicMoment || 'Não informado'}
Menu Principal: ${formData.mainMenu || 'Não informado'}
Funcionalidades: ${formData.features || 'Não informado'}
Personalização: ${formData.personalization || 'Não informado'}
Identidade Visual: ${formData.visualIdentity || 'Não informado'}
Paleta de Cores: ${formData.colorPalette || 'Não informado'}
Fonte: ${formData.font || 'Não informado'}
    `.trim();

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
            content: "Você é um especialista em criar prompts técnicos e detalhados para desenvolvimento de aplicativos SaaS com IA. Gere prompts completos, estruturados e prontos para uso no Lovable."
          },
          {
            role: "user",
            content: `Com base nestas informações do projeto, gere um prompt técnico completo e detalhado para desenvolvimento:\n\n${projectInfo}\n\nO prompt deve incluir:\n1. Descrição completa do app\n2. Funcionalidades técnicas detalhadas\n3. Estrutura de navegação\n4. Design system e identidade visual\n5. Componentes necessários\n6. Fluxos de usuário\n7. Requisitos técnicos`
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI gateway error:", response.status, error);
      throw new Error("Failed to generate prompt");
    }

    const data = await response.json();
    const generatedPrompt = data.choices[0].message.content;

    return new Response(JSON.stringify({ prompt: generatedPrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-saas-prompt:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
