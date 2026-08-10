import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

// Expected plan prices (in BRL) - minimum amounts to accept
const PLAN_PRICES: Record<string, number> = {
  monthly: 97,
  semester: 490,
};

async function verifyMercadoPagoSignature(
  dataId: string,
  xSignature: string,
  xRequestId: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = xSignature.split(',');
    const ts = parts.find(p => p.trim().startsWith('ts='))?.split('=')[1];
    const hash = parts.find(p => p.trim().startsWith('v1='))?.split('=')[1];
    
    if (!ts || !hash) {
      logStep('Missing ts or hash in signature', { ts: !!ts, hash: !!hash });
      return false;
    }
    
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const calculatedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const isValid = calculatedHash === hash;
    logStep('Signature verification', { isValid, manifest });
    
    return isValid;
  } catch (error) {
    logStep('Signature verification error', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

function mapPlanIdToPlan(planId: string): { plan: string; credits: number } {
  if (planId === "monthly") {
    return { plan: "pro", credits: 100 };
  } else if (planId === "semester") {
    return { plan: "enterprise", credits: 999999 };
  }
  return { plan: "free", credits: 5 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET');

    const bodyText = await req.text();
    const payload = JSON.parse(bodyText);
    
    logStep("Payload received", { payload });

    if (!webhookSecret) {
      logStep("Webhook secret not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured properly" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      });
    }

    if (!xSignature || !xRequestId) {
      logStep("Missing signature headers");
      return new Response(JSON.stringify({ error: "Missing signature headers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const dataId = payload.data?.id?.toString();
    if (!dataId) {
      logStep("Missing data ID for signature verification");
      return new Response(JSON.stringify({ error: "Missing data ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const isValid = await verifyMercadoPagoSignature(dataId, xSignature, xRequestId, webhookSecret);
    if (!isValid) {
      logStep("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logStep("Webhook signature verified successfully");

    if (payload.type !== "payment") {
      logStep("Ignoring non-payment notification", { type: payload.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentId = payload.data?.id;
    if (!paymentId) {
      logStep("No payment ID in webhook");
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch payment details from Mercado Pago
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

    logStep("Fetching payment details", { paymentId });
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
    logStep("Payment details retrieved", { status: payment.status, externalRef: payment.external_reference });

    const status = payment.status;
    const email = payment.payer?.email;
    const externalReference = payment.external_reference;
    const transactionAmount = payment.transaction_amount;

    // Only process approved payments
    if (status !== "approved") {
      logStep("Payment not approved", { status });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for duplicate payment processing (idempotency)
    const { data: existingPayment } = await supabaseClient
      .from("payment_history")
      .select("id")
      .eq("transaction_id", payment.id.toString())
      .single();

    if (existingPayment) {
      logStep("Payment already processed", { paymentId: payment.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine if this is a known plan ID or a signup token
    const isKnownPlanId = ["monthly", "semester"].includes(externalReference);

    if (isKnownPlanId) {
      // ---- FLOW 1: Logged-in user paying (external_reference = planId) ----
      logStep("Processing logged-in user payment", { planId: externalReference });

      // Validate payment amount
      const expectedAmount = PLAN_PRICES[externalReference];
      if (expectedAmount && transactionAmount < expectedAmount) {
        logStep("Payment amount mismatch", { expected: expectedAmount, received: transactionAmount });
        return new Response(JSON.stringify({ error: "Payment amount mismatch" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (!email) {
        logStep("No email in payment data");
        return new Response(JSON.stringify({ error: "No email in payment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Find user by email
      const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
      if (userError) throw userError;

      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        logStep("User not found for logged-in flow", { email });
        return new Response(JSON.stringify({ error: "User not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { plan, credits } = mapPlanIdToPlan(externalReference);

      await supabaseClient
        .from("user_credits")
        .update({ plan, credits, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      await supabaseClient
        .from("profiles")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      await supabaseClient.from("payment_history").insert({
        user_id: user.id,
        amount: payment.transaction_amount,
        currency: payment.currency_id || "BRL",
        status: "completed",
        payment_method: "pix",
        plan: externalReference,
        transaction_id: payment.id.toString(),
        payment_data: payment,
      });

      logStep("Logged-in user plan updated", { userId: user.id, plan });

    } else {
      // ---- FLOW 2: New user signup (external_reference = signup token) ----
      logStep("Processing new user signup via token", { token: externalReference });

      const { data: tokenData, error: tokenError } = await supabaseClient
        .from("signup_tokens")
        .select("*")
        .eq("token", externalReference)
        .eq("used", false)
        .single();

      if (tokenError || !tokenData) {
        logStep("Signup token not found or already used", { token: externalReference });
        // Token may already have been processed by confirm-pix-payment, that's ok
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check token expiration
      if (new Date(tokenData.expires_at) < new Date()) {
        logStep("Token expired", { expiresAt: tokenData.expires_at });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { email: userEmail, name, cpf, phone, password_hash: encryptedPassword, plan_id: planId } = tokenData;

      // Decrypt the password
      const encryptionKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const rawBytes = Uint8Array.from(atob(encryptedPassword), c => c.charCodeAt(0));
      const iv = rawBytes.slice(0, 12);
      const ciphertext = rawBytes.slice(12);
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(encryptionKey.slice(0, 32).padEnd(32, "0")),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        keyMaterial,
        ciphertext
      );
      const password = decoder.decode(decrypted);

      // Mark token as used and wipe sensitive fields to minimize data exposure
      await supabaseClient
        .from("signup_tokens")
        .update({ used: true, password_hash: "", cpf: "", phone: "" })
        .eq("token", externalReference);

      // Check if user already exists
      const { data: { users } } = await supabaseClient.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());

      const { plan, credits } = mapPlanIdToPlan(planId);

      if (existingUser) {
        logStep("User already exists, updating plan", { userId: existingUser.id });
        
        await supabaseClient
          .from("user_credits")
          .upsert({ user_id: existingUser.id, plan, credits }, { onConflict: "user_id" });

        await supabaseClient
          .from("profiles")
          .update({ plan, updated_at: new Date().toISOString() })
          .eq("user_id", existingUser.id);

        await supabaseClient.from("payment_history").insert({
          user_id: existingUser.id,
          amount: payment.transaction_amount,
          currency: "BRL",
          status: "completed",
          payment_method: "pix",
          plan: planId,
          transaction_id: payment.id.toString(),
          payment_data: payment,
        });

        logStep("Existing user plan updated via webhook", { userId: existingUser.id, plan });
      } else {
        // Create new user
        logStep("Creating new user via webhook", { email: userEmail });
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.admin.createUser({
          email: userEmail,
          password: password,
          email_confirm: true,
          user_metadata: { display_name: name },
        });

        if (signUpError) {
          logStep("ERROR creating user", { error: signUpError });
          throw signUpError;
        }

        const userId = signUpData.user.id;

        // Update profile with CPF and phone
        await supabaseClient
          .from("profiles")
          .update({ display_name: name, cpf, cellphone: phone, tax_id: cpf, plan })
          .eq("user_id", userId);

        // Set paid plan
        await supabaseClient
          .from("user_credits")
          .upsert({ user_id: userId, plan, credits }, { onConflict: "user_id" });

        // Record payment
        await supabaseClient.from("payment_history").insert({
          user_id: userId,
          amount: payment.transaction_amount,
          currency: "BRL",
          status: "completed",
          payment_method: "pix",
          plan: planId,
          transaction_id: payment.id.toString(),
          payment_data: payment,
        });

        logStep("New user created via webhook", { userId, plan });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
