import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PIX-PAYMENT] ${step}${detailsStr}`);
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

    const { planId, planName, planPrice, email, name, cpf, phone, password } = await req.json();
    
    // Validate required fields
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email válido é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Nome completo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!cpf || typeof cpf !== "string" || cpf.replace(/\D/g, "").length !== 11) {
      return new Response(
        JSON.stringify({ error: "CPF válido é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) {
      return new Response(
        JSON.stringify({ error: "Telefone válido é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!planId || !["monthly", "semester"].includes(planId)) {
      return new Response(
        JSON.stringify({ error: "Plano inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!planPrice || typeof planPrice !== "number" || planPrice <= 0) {
      return new Response(
        JSON.stringify({ error: "Preço inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Input validated", { email, planId, planName });

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    
    logStep("Mercado Pago credentials verified");

    const cpfClean = cpf.replace(/\D/g, "");
    const phoneClean = phone.replace(/\D/g, "");
    const totalAmount = planPrice / 100;

    // Encrypt the password before storing using AES-GCM
    const token = crypto.randomUUID();
    const encryptionKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(encryptionKey.slice(0, 32).padEnd(32, "0")),
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      encoder.encode(password)
    );
    const encryptedPassword = btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));

    const { error: tokenError } = await supabaseAdmin.from("signup_tokens").insert({
      token,
      email,
      name,
      cpf: cpfClean,
      phone: phoneClean,
      password_hash: encryptedPassword,
      plan_id: planId,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    });

    if (tokenError) {
      logStep("ERROR: Failed to create signup token", { error: tokenError });
      throw new Error("Erro ao processar dados do usuário");
    }

    logStep("Signup token created", { token });

    const paymentBody = {
      transaction_amount: totalAmount,
      description: `${planName} - NexusIA`,
      payment_method_id: "pix",
      payer: {
        email: email,
        first_name: name.split(" ")[0],
        last_name: name.split(" ").slice(1).join(" ") || name.split(" ")[0],
        identification: {
          type: "CPF",
          number: cpfClean
        }
      },
      external_reference: token, // Only the secure token, no sensitive data
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
    };

    logStep("Creating Mercado Pago Payment", { email, planId, amount: totalAmount });

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${email}-${planId}-${Date.now()}`
    };

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(paymentBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Mercado Pago API error", { status: response.status, error: errorText });
      throw new Error(`Erro ao gerar pagamento: ${response.status}`);
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
