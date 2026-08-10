import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
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
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe signature found");

    const body = await req.text();
    
    // Require webhook secret for security
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("Webhook secret not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured properly" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event type", { type: event.type });

    // Handle payment success events
    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const session = event.data.object as any;
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      if (!customerEmail) {
        logStep("No customer email found");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Processing payment for email", { email: customerEmail });

      // Get user by email
      const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
      
      if (userError) {
        logStep("Error fetching users", { error: userError });
        throw userError;
      }

      const user = userData.users.find(u => u.email === customerEmail);
      
      if (!user) {
        logStep("User not found", { email: customerEmail });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("User found", { userId: user.id });

      // Determine plan based on amount or price ID
      let plan = "free";
      let credits = 5;
      const amount = session.amount_total || session.amount;
      
      // Check if it's a subscription or one-time payment
      const mode = session.mode || (session.object === "payment_intent" ? "payment" : "subscription");
      
      if (mode === "subscription" || (amount && amount >= 9700 && amount <= 10000)) {
        plan = "pro";
        credits = 100;
      } else if (amount && amount >= 290000) {
        plan = "enterprise";
        credits = 9999;
      }

      logStep("Determined plan", { plan, credits, amount, mode });

      // Check if payment already processed
      const paymentId = session.id || session.payment_intent;
      const { data: existingPayment } = await supabaseClient
        .from("payment_history")
        .select("id")
        .eq("transaction_id", paymentId)
        .single();

      if (existingPayment) {
        logStep("Payment already processed", { paymentId });
        return new Response(JSON.stringify({ received: true, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update user_credits
      const { error: creditsError } = await supabaseClient
        .from("user_credits")
        .update({ 
          plan, 
          credits,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", user.id);

      if (creditsError) {
        logStep("Error updating credits", { error: creditsError });
        throw creditsError;
      }

      logStep("Credits updated successfully");

      // Update profiles
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({ 
          plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription || null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (profileError) {
        logStep("Error updating profile", { error: profileError });
        throw profileError;
      }

      logStep("Profile updated successfully");

      // Record payment history
      const { error: historyError } = await supabaseClient
        .from("payment_history")
        .insert({
          user_id: user.id,
          transaction_id: paymentId,
          amount: amount ? amount / 100 : 0,
          currency: session.currency || "brl",
          status: "approved",
          payment_method: "credit_card",
          plan,
          payment_data: {
            stripe_customer_id: session.customer,
            stripe_session_id: session.id,
            mode: mode
          }
        });

      if (historyError) {
        logStep("Error recording payment history", { error: historyError });
        throw historyError;
      }

      logStep("Payment recorded successfully");

      return new Response(JSON.stringify({ 
        received: true, 
        message: "Plan updated successfully" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle subscription events
    if (event.type === "customer.subscription.updated" || 
        event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      
      logStep("Processing subscription event", { 
        subscriptionId: subscription.id,
        status: subscription.status 
      });

      // Get customer email
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const customerEmail = (customer as Stripe.Customer).email;

      if (!customerEmail) {
        logStep("No customer email found for subscription");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userData } = await supabaseClient.auth.admin.listUsers();
      const user = userData.users.find(u => u.email === customerEmail);

      if (!user) {
        logStep("User not found for subscription", { email: customerEmail });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If subscription is cancelled or past_due, downgrade to free
      if (subscription.status === "canceled" || subscription.status === "past_due") {
        await supabaseClient
          .from("user_credits")
          .update({ 
            plan: "free", 
            credits: 5,
            updated_at: new Date().toISOString() 
          })
          .eq("user_id", user.id);

        await supabaseClient
          .from("profiles")
          .update({ 
            plan: "free",
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        logStep("Subscription downgraded to free", { userId: user.id });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
