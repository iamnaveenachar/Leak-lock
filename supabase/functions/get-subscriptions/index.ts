import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: get-subscriptions
 * 
 * This function retrieves all subscriptions for the authenticated user.
 * It supports optional filtering by:
 * - status (active, paused, cancelled)
 * - category (Entertainment, Productivity, etc.)
 * - provider (Netflix, Spotify, etc.)
 * 
 * Query parameters:
 * - status: Filter by subscription status
 * - category: Filter by subscription category
 * - provider: Filter by provider name
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

    console.log(`Fetching subscriptions for user: ${user.id}`);

    // Parse query parameters from URL
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const provider = url.searchParams.get('provider');

    // Build query with filters
    let query = supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
      console.log(`Filtering by status: ${status}`);
    }
    if (category) {
      query = query.eq('category', category);
      console.log(`Filtering by category: ${category}`);
    }
    if (provider) {
      query = query.eq('provider', provider);
      console.log(`Filtering by provider: ${provider}`);
    }

    // Order by next billing date (soonest first)
    query = query.order('next_billing_date', { ascending: true });

    // Execute query
    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Retrieved ${subscriptions?.length || 0} subscriptions`);

    // Calculate summary statistics
    const totalActive = subscriptions?.filter(sub => sub.status === 'active').length || 0;
    const totalAmount = subscriptions
      ?.filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + Number(sub.amount), 0) || 0;

    return new Response(
      JSON.stringify({
        subscriptions: subscriptions || [],
        summary: {
          total: subscriptions?.length || 0,
          active: totalActive,
          total_monthly_cost: Math.round(totalAmount * 100) / 100,
        },
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
