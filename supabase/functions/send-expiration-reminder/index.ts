import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EXPIRATION-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  try {
    logStep("Starting expiration reminder check");
    
    const now = new Date();
    
    // Calculate dates for reminders (7, 3, and 1 days before expiration)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);

    logStep("Calculated reminder dates", {
      sevenDays: sevenDaysFromNow.toISOString(),
      threeDays: threeDaysFromNow.toISOString(),
      oneDay: oneDayFromNow.toISOString()
    });

    // Get users who need reminders
    // Users with active subscriptions expiring in 7, 3, or 1 day
    // and haven't received a reminder in the last 18 hours
    const { data: usersToNotify, error: queryError } = await supabaseClient
      .from("user_credits")
      .select(`
        user_id,
        subscription_end,
        plan,
        last_reminder_sent
      `)
      .not("subscription_end", "is", null)
      .in("plan", ["pro", "enterprise"])
      .or(
        `subscription_end.lte.${sevenDaysFromNow.toISOString()},subscription_end.lte.${threeDaysFromNow.toISOString()},subscription_end.lte.${oneDayFromNow.toISOString()}`
      );

    if (queryError) {
      logStep("Error querying users", { error: queryError.message });
      throw queryError;
    }

    logStep("Found potential users to notify", { count: usersToNotify?.length || 0 });

    if (!usersToNotify || usersToNotify.length === 0) {
      logStep("No users need reminders at this time");
      return new Response(JSON.stringify({ 
        message: "No reminders needed",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let emailsSent = 0;
    const errors: any[] = [];

    for (const userCredit of usersToNotify) {
      try {
        const subscriptionEnd = new Date(userCredit.subscription_end);
        const daysUntilExpiration = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Skip if already sent reminder in last 18 hours
        if (userCredit.last_reminder_sent) {
          const lastSent = new Date(userCredit.last_reminder_sent);
          const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastReminder < 18) {
            logStep("Skipping user - reminder sent recently", { 
              userId: userCredit.user_id,
              hoursSince: hoursSinceLastReminder 
            });
            continue;
          }
        }

        // Only send reminders at 7, 3, or 1 day marks
        if (daysUntilExpiration !== 7 && daysUntilExpiration !== 3 && daysUntilExpiration !== 1) {
          continue;
        }

        // Get user profile to send email
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", userCredit.user_id)
          .single();

        if (profileError || !profile) {
          logStep("Error fetching profile", { userId: userCredit.user_id, error: profileError?.message });
          errors.push({ userId: userCredit.user_id, error: "Profile not found" });
          continue;
        }

        const planLabel = userCredit.plan === "pro" ? "Pro" : "Enterprise";
        const expirationDate = subscriptionEnd.toLocaleDateString("pt-BR");

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: "Nylus IA <onboarding@resend.dev>",
          to: [profile.email],
          subject: `⏰ Seu plano ${planLabel} vence em ${daysUntilExpiration} ${daysUntilExpiration === 1 ? 'dia' : 'dias'}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                  .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                  .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🔔 Lembrete de Vencimento</h1>
                  </div>
                  <div class="content">
                    <p>Olá ${profile.display_name || 'usuário'},</p>
                    
                    <div class="alert">
                      <strong>⏰ Atenção:</strong> Seu plano <strong>${planLabel}</strong> vence em <strong>${daysUntilExpiration} ${daysUntilExpiration === 1 ? 'dia' : 'dias'}</strong>.
                    </div>
                    
                    <p><strong>Data de vencimento:</strong> ${expirationDate}</p>
                    
                    <p>Para continuar aproveitando todos os recursos premium, certifique-se de que sua forma de pagamento está ativa e atualizada.</p>
                    
                    <p>Após o vencimento, você perderá acesso a:</p>
                    <ul>
                      <li>✨ Geração ilimitada de prompts de SaaS</li>
                      <li>🤖 Chat de vendas com IA</li>
                      <li>🔍 Prospecção de leads automática</li>
                      <li>📊 CRM completo</li>
                      <li>💰 Gestão financeira</li>
                    </ul>
                    
                    <center>
                      <a href="${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://app.")}/pricing" class="button">
                        Renovar Assinatura
                      </a>
                    </center>
                    
                    <p>Se você tiver alguma dúvida, entre em contato com nosso suporte.</p>
                    
                    <p>Atenciosamente,<br><strong>Equipe Nylus IA</strong></p>
                  </div>
                  <div class="footer">
                    <p>Você está recebendo este email porque tem uma assinatura ativa no Nylus IA.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (emailError) {
          logStep("Error sending email", { userId: userCredit.user_id, error: emailError });
          errors.push({ userId: userCredit.user_id, error: emailError });
          continue;
        }

        // Update last_reminder_sent
        await supabaseClient
          .from("user_credits")
          .update({ last_reminder_sent: now.toISOString() })
          .eq("user_id", userCredit.user_id);

        emailsSent++;
        logStep("Email sent successfully", { 
          userId: userCredit.user_id, 
          email: profile.email,
          daysUntilExpiration 
        });

      } catch (error) {
        logStep("Error processing user", { 
          userId: userCredit.user_id, 
          error: error instanceof Error ? error.message : String(error) 
        });
        errors.push({ 
          userId: userCredit.user_id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    logStep("Reminder process completed", { 
      totalProcessed: usersToNotify.length,
      emailsSent,
      errors: errors.length 
    });

    return new Response(JSON.stringify({
      message: "Reminders processed successfully",
      totalProcessed: usersToNotify.length,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-expiration-reminder", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
