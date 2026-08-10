import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { campaignId } = await req.json();
    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get campaign
    const { data: campaign, error: campError } = await supabase
      .from("whatsapp_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campanha não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      throw new Error("Z-API credentials not configured");
    }

    // Update campaign status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin
      .from("whatsapp_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString(), total_count: campaign.target_phones.length })
      .eq("id", campaignId);

    let sentCount = 0;
    let failedCount = 0;

    for (const phone of campaign.target_phones) {
      try {
        const cleanPhone = phone.replace(/\D/g, '');
        
        const response = await fetch(
          `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
            },
            body: JSON.stringify({
              phone: cleanPhone,
              message: campaign.message_template,
            }),
          }
        );

        if (response.ok) {
          sentCount++;
        } else {
          failedCount++;
          console.error(`Failed to send to ${cleanPhone}:`, await response.text());
        }

        // Delay between messages to avoid rate limiting (2 seconds)
        await delay(2000);
      } catch (err) {
        failedCount++;
        console.error(`Error sending to ${phone}:`, err);
      }

      // Update progress
      await supabaseAdmin
        .from("whatsapp_campaigns")
        .update({ sent_count: sentCount, failed_count: failedCount })
        .eq("id", campaignId);
    }

    // Mark campaign as completed
    await supabaseAdmin
      .from("whatsapp_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in zapi-send-bulk:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
