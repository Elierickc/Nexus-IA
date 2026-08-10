import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-MERCADOPAGO-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check rate limit: 5 requests per minute for payment endpoints
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc("check_rate_limit", {
      _user_id: user.id,
      _endpoint: "verify-mercadopago-payment",
      _max_requests: 5,
      _window_seconds: 60,
    });

    if (rateLimitError) {
      logStep("Rate limit check error", { error: rateLimitError });
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

    const { paymentId, planId } = await req.json();
    
    // Validate payment ID format
    if (!paymentId || typeof paymentId !== "string" && typeof paymentId !== "number") {
      return new Response(
        JSON.stringify({ error: "Payment ID is required and must be a string or number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate plan ID
    if (!planId || typeof planId !== "string") {
      return new Response(
        JSON.stringify({ error: "Plan ID is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["monthly", "semester"].includes(planId)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan ID. Must be 'monthly' or 'semester'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Mercado Pago credentials
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const publicKey = Deno.env.get("MERCADO_PAGO_PUBLIC_KEY");
    const clientId = Deno.env.get("MERCADO_PAGO_CLIENT_ID");
    const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");
    
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    
    logStep("Mercado Pago credentials loaded", { 
      hasAccessToken: !!accessToken,
      hasPublicKey: !!publicKey,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });

    // Check payment status with Mercado Pago
    logStep("Checking payment status", { paymentId });
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Mercado Pago API error", { status: response.status, error: errorText });
      throw new Error(`Mercado Pago API error: ${errorText}`);
    }

    const payment = await response.json();
    const paymentStatus = payment.status;
    logStep("Payment status retrieved", { paymentStatus });

    // Map planId to expected plan name
    let expectedPlan = "free";
    if (planId === "monthly") {
      expectedPlan = "pro";
    } else if (planId === "semester") {
      expectedPlan = "enterprise";
    }

    // Check if user's plan has already been updated
    const { data: userCredits, error: creditsError } = await supabaseClient
      .from("user_credits")
      .select("plan, credits")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      logStep("ERROR: Failed to fetch user credits", { error: creditsError });
      throw creditsError;
    }

    logStep("Current user plan and payment status", { currentPlan: userCredits.plan, expectedPlan, paymentStatus });

    // If payment is approved and plan matches
    if (paymentStatus === "approved" && userCredits.plan === expectedPlan) {
      logStep("Payment confirmed - plan already updated", { userId: user.id, plan: expectedPlan });

      return new Response(JSON.stringify({
        success: true,
        paid: true,
        status: paymentStatus,
        plan: expectedPlan,
        message: "Pagamento confirmado! Seu plano foi atualizado."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If payment is approved but plan not updated yet
    if (paymentStatus === "approved") {
      logStep("Payment approved, waiting for webhook to update plan", { paymentStatus });
      return new Response(JSON.stringify({
        success: true,
        paid: false,
        status: paymentStatus,
        message: "Pagamento confirmado! Aguarde alguns instantes enquanto atualizamos seu plano."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Payment not completed yet
    logStep("Payment not confirmed yet", { currentPlan: userCredits.plan, expectedPlan, paymentStatus });
    return new Response(JSON.stringify({
      success: true,
      paid: false,
      status: paymentStatus,
      message: "Pagamento ainda não foi confirmado. Por favor, aguarde alguns instantes."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
