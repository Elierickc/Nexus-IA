import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-MERCADOPAGO-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check rate limit: 5 requests per minute for payment endpoints
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient.rpc("check_rate_limit", {
      _user_id: user.id,
      _endpoint: "create-mercadopago-payment",
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

    const { planId, planName, planPrice } = await req.json();
    
    // Validate plan information
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

    if (!planName || typeof planName !== "string" || planName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Plan name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!planPrice || typeof planPrice !== "number" || planPrice <= 0) {
      return new Response(
        JSON.stringify({ error: "Plan price must be a positive number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all Mercado Pago credentials
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const publicKey = Deno.env.get("MERCADO_PAGO_PUBLIC_KEY");
    const clientId = Deno.env.get("MERCADO_PAGO_CLIENT_ID");
    const clientSecret = Deno.env.get("MERCADO_PAGO_CLIENT_SECRET");
    
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    
    logStep("Mercado Pago credentials verified", { 
      hasAccessToken: !!accessToken,
      hasPublicKey: !!publicKey,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    });

    // Convert price from cents to decimal
    const totalAmount = planPrice / 100;

    // Create Payment with Mercado Pago (Pix)
    const paymentBody = {
      transaction_amount: totalAmount,
      description: `${planName}`,
      payment_method_id: "pix",
      payer: {
        email: user.email,
      },
      external_reference: planId,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
    };

    logStep("Creating Mercado Pago Payment", { paymentBody });

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${user.id}-${planId}-${Date.now()}`
    };
    
    logStep("Request headers prepared", { 
      hasAuth: !!headers.Authorization,
      authLength: headers.Authorization.length 
    });

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(paymentBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Mercado Pago API error", { status: response.status, error: errorText });
      throw new Error(`Mercado Pago API error: ${errorText}`);
    }

    const result = await response.json();
    const paymentId = result.id;
    const qrCode = result.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64;
    const ticketUrl = result.point_of_interaction?.transaction_data?.ticket_url;
    
    logStep("Payment created successfully", { 
      paymentId, 
      hasQrCode: !!qrCode,
      hasQrCodeBase64: !!qrCodeBase64,
      status: result.status
    });

    return new Response(JSON.stringify({
      paymentId: paymentId,
      qrData: qrCode,
      qrCodeBase64: qrCodeBase64,
      ticketUrl: ticketUrl,
      amount: result.transaction_amount,
      status: result.status,
      expiresAt: result.date_of_expiration,
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
