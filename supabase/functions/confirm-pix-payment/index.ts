import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-PIX-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { paymentId } = await req.json();
    
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "Payment ID é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");

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
      throw new Error(`Erro ao verificar pagamento`);
    }

    const payment = await response.json();
    const paymentStatus = payment.status;
    logStep("Payment status retrieved", { paymentStatus });

    if (paymentStatus !== "approved") {
      return new Response(JSON.stringify({
        paid: false,
        status: paymentStatus,
        message: "Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for duplicate payment processing
    const { data: existingPayment } = await supabaseAdmin
      .from("payment_history")
      .select("id, user_id")
      .eq("transaction_id", String(paymentId))
      .single();

    if (existingPayment) {
      logStep("Payment already processed", { paymentId });
      return new Response(JSON.stringify({
        paid: true,
        userCreated: false,
        message: "Pagamento já foi processado. Faça login para acessar.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Payment approved - retrieve user data from signup_tokens table
    const token = payment.external_reference;
    logStep("Looking up signup token", { token });

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("signup_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (tokenError || !tokenData) {
      logStep("ERROR: Token not found or already used", { token, error: tokenError });
      return new Response(JSON.stringify({
        error: "Token de cadastro inválido ou já utilizado"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check token expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      logStep("ERROR: Token expired", { expiresAt: tokenData.expires_at });
      return new Response(JSON.stringify({
        error: "Token de cadastro expirado"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { email, name, cpf, phone, password_hash: encryptedPassword, plan_id: planId } = tokenData;
    
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
    await supabaseAdmin
      .from("signup_tokens")
      .update({ used: true, password_hash: "", cpf: "", phone: "" })
      .eq("token", token);

    const expectedPlan = planId === "semester" ? "enterprise" : "pro";
    const credits = planId === "semester" ? 999999 : 100;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.find(u => u.email === email);

    if (userExists) {
      logStep("User already exists, updating plan", { userId: userExists.id });
      
      await supabaseAdmin
        .from("user_credits")
        .upsert({
          user_id: userExists.id,
          plan: expectedPlan,
          credits: credits
        }, { onConflict: "user_id" });

      await supabaseAdmin
        .from("profiles")
        .update({ plan: expectedPlan, updated_at: new Date().toISOString() })
        .eq("user_id", userExists.id);

      await supabaseAdmin.from("payment_history").insert({
        user_id: userExists.id,
        amount: payment.transaction_amount,
        currency: "BRL",
        status: "completed",
        payment_method: "pix",
        transaction_id: String(paymentId),
        plan: planId === "semester" ? "Semestral" : "Mensal"
      });

      return new Response(JSON.stringify({
        paid: true,
        userCreated: false,
        message: "Pagamento confirmado! Seu plano foi atualizado.",
        email: email
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new user
    logStep("Creating new user", { email });
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
      }
    });

    if (signUpError) {
      logStep("ERROR: Failed to create user", { error: signUpError });
      throw new Error(`Erro ao criar conta: ${signUpError.message}`);
    }

    const userId = signUpData.user.id;
    logStep("User created", { userId });

    // Update profile with personal data and paid plan
    await supabaseAdmin
      .from("profiles")
      .update({
        display_name: name,
        cpf: cpf,
        cellphone: phone,
        tax_id: cpf,
        plan: expectedPlan,
      })
      .eq("user_id", userId);

    // Set paid plan in user_credits
    await supabaseAdmin
      .from("user_credits")
      .upsert({
        user_id: userId,
        plan: expectedPlan,
        credits: credits
      }, { onConflict: "user_id" });

    // Record payment history
    await supabaseAdmin.from("payment_history").insert({
      user_id: userId,
      amount: payment.transaction_amount,
      currency: "BRL",
      status: "completed",
      payment_method: "pix",
      transaction_id: String(paymentId),
      plan: planId === "semester" ? "Semestral" : "Mensal"
    });

    logStep("User setup completed", { userId, plan: expectedPlan });

    return new Response(JSON.stringify({
      paid: true,
      userCreated: true,
      message: "Pagamento confirmado! Sua conta foi criada com sucesso. Faça login para acessar.",
      email: email
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
