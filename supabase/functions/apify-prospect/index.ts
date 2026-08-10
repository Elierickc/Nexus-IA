import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApifySearchParams {
  query: string;
  maxResults?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase.rpc(
      'check_rate_limit',
      {
        _user_id: user.id,
        _endpoint: 'apify-prospect',
        _max_requests: 10,
        _window_seconds: 3600
      }
    );

    if (rateLimitError) {
      console.error('Rate limit error:', rateLimitError);
      throw new Error('Rate limit check failed');
    }

    if (!rateLimitData) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credit
    const { data: creditData, error: creditError } = await supabase.rpc(
      'deduct_credit',
      { user_id_param: user.id }
    );

    if (creditError || !creditData) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, maxResults = 10 }: ApifySearchParams = await req.json();

    if (!query) {
      throw new Error('Query parameter is required');
    }

    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY not configured');
    }

    // Start Apify actor run for Google Maps scraper
    console.log('Starting Apify actor run for query:', query);
    const payload = {
      searchStringsArray: [query],
      language: 'pt-BR',
      locationQuery: 'Brazil',
      maxCrawledPlacesPerSearch: maxResults,
      maxImages: 0,
      maximumLeadsEnrichmentRecords: 0,
      includeWebResults: false,
      scrapeContacts: false,
      scrapeDirectories: false,
      scrapeImageAuthors: false,
      scrapePlaceDetailPage: false,
      scrapeReviewsPersonalData: true,
      scrapeTableReservationProvider: false,
      skipClosedPlaces: false,
    };
    console.log('Apify payload:', payload);
    
    const actorRunResponse = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify(payload),
      }
    );

    if (!actorRunResponse.ok) {
      const errorText = await actorRunResponse.text();
      console.error('Apify API error:', errorText);
      throw new Error(`Failed to run Apify actor: ${errorText}`);
    }

    const results = await actorRunResponse.json();
    console.log('Apify results:', results);

    // Process and prepare leads for CRM
    const leadsToInsert = results.map((item: any) => ({
      owner_id: user.id,
      name: item.title || item.name || 'Sem nome',
      company: item.categoryName || null,
      phone: item.phone || item.phoneNumber || null,
      email: item.email || item.emails?.[0] || item.contactEmail || null,
      source: 'Apify Google Maps',
      status: 'new',
      notes: item.address ? `Endereço: ${item.address}${item.rating ? ` | Avaliação: ${item.rating}` : ''}` : null,
    }));

    console.log(`Preparing to insert ${leadsToInsert.length} leads into CRM`);

    // Insert leads into CRM system
    const { data: insertedLeads, error: insertError } = await supabase
      .from('crm_leads')
      .insert(leadsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting CRM leads:', insertError);
      throw new Error('Failed to save leads to CRM: ' + insertError.message);
    }

    console.log(`✅ Successfully saved ${insertedLeads?.length || 0} leads to CRM`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leads: insertedLeads,
        totalFound: results.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in apify-prospect function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});