import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
      _endpoint: "generate-app",
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
      prompt: requestBody.prompt,
      conversationHistory: requestBody.conversationHistory,
    };

    if (!validation.prompt || typeof validation.prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.prompt.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Prompt must be at least 10 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.prompt.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long (maximum 5000 characters)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.conversationHistory && !Array.isArray(validation.conversationHistory)) {
      return new Response(
        JSON.stringify({ error: "Conversation history must be an array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.conversationHistory && validation.conversationHistory.length > 50) {
      return new Response(
        JSON.stringify({ error: "Conversation history too long (maximum 50 messages)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { prompt, conversationHistory } = validation;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Generating app with prompt:", prompt);

    // Build conversation context
    const messages = [
      {
        role: "system",
        content: `Você é um assistente especializado em gerar código de aplicativos web.
        
Quando o usuário descrever um app, você deve:
1. Analisar os requisitos
2. Gerar um código React/TypeScript funcional e completo
3. Usar Tailwind CSS para estilização
4. Incluir comentários explicativos
5. Seguir as melhores práticas

Responda de forma conversacional explicando o que você criou, e inclua o código completo ao final da sua resposta dentro de um bloco de código markdown.`
      },
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current prompt
    messages.push({
      role: "user",
      content: prompt,
    });

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log("AI response generated successfully");

    // Extract code from markdown code blocks if present
    const codeMatch = aiResponse.match(/```(?:tsx?|typescript|javascript)?\n([\s\S]*?)```/);
    const extractedCode = codeMatch ? codeMatch[1] : "";

    return new Response(
      JSON.stringify({
        response: aiResponse,
        code: extractedCode,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-app function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
