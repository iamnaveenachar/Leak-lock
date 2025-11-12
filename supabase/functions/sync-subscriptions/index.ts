import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: sync-subscriptions
 * 
 * This function randomly assigns 6-9 subscriptions from the subscription_templates table
 * to the authenticated user. It creates personalized subscription records by:
 * 1. Fetching all available subscription templates
 * 2. Randomly selecting 6-9 templates
 * 3. Creating subscription records for the user with randomized:
 *    - Amount (within template's min/max range)
 *    - Next billing date (1-30 days in the future)
 *    - Status (active, paused, or cancelled)
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log(`Syncing subscriptions for user: ${user.id}`);

    // Check if user already has subscriptions
    const { data: existingSubs, error: checkError } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing subscriptions:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: checkError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // If user already has subscriptions, return them
    if (existingSubs && existingSubs.length > 0) {
      const { data: userSubs, error: fetchError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching subscriptions:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Database error', details: fetchError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`User already has ${userSubs?.length || 0} subscriptions`);
      return new Response(
        JSON.stringify({ subscriptions: userSubs, message: 'Existing subscriptions retrieved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch all subscription templates
    const { data: templates, error: templatesError } = await supabaseClient
      .from('subscription_templates')
      .select('*');

    if (templatesError || !templates || templates.length === 0) {
      console.error('Error fetching templates:', templatesError);
      return new Response(
        JSON.stringify({ error: 'No subscription templates available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Found ${templates.length} subscription templates`);

    // Randomly select 6-9 templates
    const numberOfSubs = Math.floor(Math.random() * 4) + 6; // Random number between 6-9
    const shuffled = templates.sort(() => 0.5 - Math.random());
    const selectedTemplates = shuffled.slice(0, Math.min(numberOfSubs, templates.length));

    console.log(`Generating ${selectedTemplates.length} subscriptions for user`);

    // Create subscription records from templates
    const subscriptions = selectedTemplates.map((template) => {
      // Randomize amount within template's range
      const amount = template.amount_min === template.amount_max
        ? template.amount_min
        : Math.random() * (template.amount_max - template.amount_min) + template.amount_min;

      // Generate random next billing date (1-30 days from now)
      const daysUntilBilling = Math.floor(Math.random() * 30) + 1;
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + daysUntilBilling);

      // Randomly assign status (80% active, 15% paused, 5% cancelled)
      const statusRoll = Math.random();
      let status = 'active';
      if (statusRoll > 0.95) status = 'cancelled';
      else if (statusRoll > 0.80) status = 'paused';

      return {
        user_id: user.id,
        provider: template.provider,
        name: template.name,
        category: template.category,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        billing_cycle: template.billing_cycle,
        currency: template.currency,
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        status: status,
        payment_method: null,
        notes: null,
      };
    });

    // Insert subscriptions into database
    const { data: insertedSubs, error: insertError } = await supabaseClient
      .from('subscriptions')
      .insert(subscriptions)
      .select();

    if (insertError) {
      console.error('Error inserting subscriptions:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscriptions', details: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Successfully created ${insertedSubs?.length || 0} subscriptions`);

    return new Response(
      JSON.stringify({ 
        subscriptions: insertedSubs, 
        message: `Successfully synced ${insertedSubs?.length || 0} subscriptions` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
