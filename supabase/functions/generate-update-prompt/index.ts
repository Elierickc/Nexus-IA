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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { initialPrompt, updateType } = await req.json();

    if (!initialPrompt || !updateType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const updateTypeDescriptions: Record<string, string> = {
      'new-feature': 'Adicionar uma nova funcionalidade ao sistema',
      'ui-change': 'Alterar a interface do usuário e elementos visuais',
      'bug-fix': 'Corrigir bugs e problemas existentes',
      'performance': 'Melhorar a performance e otimização',
      'integration': 'Integrar com serviços ou APIs externas',
      'refactoring': 'Refatorar e melhorar a qualidade do código',
      'security': 'Implementar melhorias de segurança',
      'database': 'Realizar alterações na estrutura do banco de dados',
    };

    const systemPrompt = `Você é um assistente especializado em criar prompts estruturados para atualização de projetos de software.

Seu objetivo é analisar o prompt inicial de um projeto e o tipo de atualização desejada, e gerar um prompt claro, detalhado e estruturado que a IA possa usar para implementar as mudanças necessárias.

O prompt gerado deve:
1. Referenciar o contexto do projeto original
2. Especificar claramente o que precisa ser alterado/adicionado
3. Manter a consistência com a arquitetura existente
4. Incluir requisitos técnicos específicos
5. Mencionar considerações de compatibilidade
6. Ser claro e objetivo

Formato esperado:
- Começar com "Atualização do Projeto: [Tipo]"
- Contexto do projeto atual (resumido)
- Objetivos da atualização
- Requisitos técnicos
- Considerações importantes`;

    const userPrompt = `PROMPT INICIAL DO PROJETO:
${initialPrompt}

TIPO DE ATUALIZAÇÃO: ${updateTypeDescriptions[updateType] || updateType}

Por favor, gere um prompt estruturado que a IA possa usar para implementar esta atualização de forma eficiente e consistente com o projeto existente.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Failed to generate update prompt');
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content;

    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    return new Response(
      JSON.stringify({ prompt: generatedPrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-update-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
