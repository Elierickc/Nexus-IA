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
      _endpoint: "google-business-search",
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
      location: requestBody.location,
      businessType: requestBody.businessType,
    };

    if (!validation.location || typeof validation.location !== "string") {
      return new Response(
        JSON.stringify({ error: "Location is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!validation.businessType || typeof validation.businessType !== "string") {
      return new Response(
        JSON.stringify({ error: "Business type is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.location.trim().length < 2 || validation.location.length > 200) {
      return new Response(
        JSON.stringify({ error: "Location must be between 2 and 200 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (validation.businessType.trim().length < 2 || validation.businessType.length > 200) {
      return new Response(
        JSON.stringify({ error: "Business type must be between 2 and 200 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { location, businessType } = validation;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use AI to generate realistic business data based on location and type
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
            content: "Você é um assistente que gera dados realistas de empresas locais brasileiras. Gere informações verossímeis baseadas em dados reais do mercado."
          },
          {
            role: "user",
            content: `Gere 5 empresas do tipo "${businessType}" na região de "${location}". Para cada empresa, forneça: nome realista, endereço completo, telefone, email, site (se aplicável), Instagram, e uma breve descrição do negócio. Retorne em formato JSON: [{"name": "...", "address": "...", "phone": "...", "email": "...", "website": "...", "instagram": "...", "description": "...", "category": "${businessType}"}]`
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI gateway error:", response.status, error);
      throw new Error("Failed to generate business data");
    }

    const data = await response.json();
    const businessesText = data.choices[0].message.content;
    
    // Try to parse as JSON
    let businesses;
    try {
      // Remove markdown code blocks if present
      const cleanedText = businessesText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      businesses = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      // Return a fallback structure if parsing fails
      businesses = [{
        name: "Erro ao processar dados",
        address: "Por favor, tente novamente",
        phone: "",
        email: "",
        website: "",
        instagram: "",
        description: businessesText,
        category: businessType
      }];
    }

    return new Response(JSON.stringify({ businesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in google-business-search:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
