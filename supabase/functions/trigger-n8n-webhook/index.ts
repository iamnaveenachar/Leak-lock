import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { eventType, eventData } = await req.json();
    
    console.log(`Triggering n8n webhooks for event: ${eventType}`);

    // Fetch active webhooks for this event type
    const { data: webhooks, error: webhooksError } = await supabase
      .from('n8n_webhooks')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_type', eventType)
      .eq('is_active', true);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No active webhooks found for this event type');
      return new Response(
        JSON.stringify({ message: 'No active webhooks found', triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger all webhooks
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        console.log(`Triggering webhook: ${webhook.webhook_name} at ${webhook.webhook_url}`);
        
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType,
            eventData,
            timestamp: new Date().toISOString(),
            userId: user.id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook ${webhook.webhook_name} failed: ${response.statusText}`);
        }

        return { webhook: webhook.webhook_name, status: 'success' };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Triggered ${successful} webhooks successfully, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Webhooks triggered',
        triggered: successful,
        failed: failed,
        results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in trigger-n8n-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});