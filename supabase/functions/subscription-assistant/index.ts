import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known providers with their capabilities
const PROVIDER_INFO: Record<string, {
  allowsPause: boolean;
  cancelSteps?: string[];
  pauseSteps?: string[];
  renewSteps?: string[];
  url?: string;
}> = {
  netflix: {
    allowsPause: false,
    cancelSteps: [
      "Open Netflix app or visit netflix.com",
      "Go to Account settings",
      "Click 'Cancel Membership'",
      "Confirm cancellation",
      "You'll have access until the end of your billing period"
    ],
    renewSteps: [
      "Open Netflix app or visit netflix.com",
      "Go to Account settings",
      "Click 'Restart Membership'",
      "Choose your plan and confirm"
    ],
    url: "https://www.netflix.com/cancelplan"
  },
  spotify: {
    allowsPause: true,
    cancelSteps: [
      "Open Spotify app or visit spotify.com/account",
      "Click on 'Subscription' in the menu",
      "Select 'Cancel Premium'",
      "Follow the prompts to confirm",
      "Premium benefits end at the next billing date"
    ],
    pauseSteps: [
      "Open Spotify app or visit spotify.com/account",
      "Go to Subscription settings",
      "Select 'Pause my subscription'",
      "Choose how long to pause (1-3 months)",
      "Confirm your choice"
    ],
    renewSteps: [
      "Open Spotify app or visit spotify.com/account",
      "Click on 'Subscription'",
      "Select 'Resume Premium'",
      "Confirm to restart your subscription"
    ],
    url: "https://www.spotify.com/account/subscription/"
  },
  "amazon prime": {
    allowsPause: false,
    cancelSteps: [
      "Go to Amazon.in and sign in",
      "Navigate to 'Account & Lists' → 'Prime Membership'",
      "Click 'End Membership'",
      "Follow the cancellation flow",
      "Confirm your choice"
    ],
    renewSteps: [
      "Go to Amazon.in and sign in",
      "Navigate to 'Account & Lists' → 'Prime Membership'",
      "Click 'Restart Your Membership'",
      "Complete the payment process"
    ],
    url: "https://www.amazon.in/mc/manageyourmembership"
  },
  youtube: {
    allowsPause: true,
    cancelSteps: [
      "Open YouTube app or visit youtube.com",
      "Go to Settings → Purchases & memberships",
      "Select your YouTube Premium subscription",
      "Click 'Manage' then 'Cancel subscription'",
      "Confirm cancellation"
    ],
    pauseSteps: [
      "Open YouTube app or visit youtube.com",
      "Go to Settings → Purchases & memberships",
      "Select 'Pause membership'",
      "Choose duration and confirm"
    ],
    renewSteps: [
      "Open YouTube app or visit youtube.com",
      "Go to Settings → Purchases & memberships",
      "Click 'Resume membership'",
      "Confirm to restart"
    ],
    url: "https://www.youtube.com/paid_memberships"
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing message:', message);

    // Use AI to extract intent and provider from user message
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a subscription management assistant. Extract the action (cancel, pause, or renew) and the service name from the user's message. 
            
            Respond ONLY with a JSON object in this exact format:
            {"action": "cancel|pause|renew", "service": "service name"}
            
            If you can't determine the action or service, use "unknown" for that field.
            Examples:
            - "I want to cancel Netflix" -> {"action": "cancel", "service": "netflix"}
            - "How do I pause my Spotify subscription?" -> {"action": "pause", "service": "spotify"}
            - "Renew Amazon Prime" -> {"action": "renew", "service": "amazon prime"}
            - "Help me with YouTube" -> {"action": "unknown", "service": "youtube"}
            `
          },
          {
            role: 'user',
            content: message
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    console.log('AI response:', aiContent);

    // Parse AI response
    let intent;
    try {
      intent = JSON.parse(aiContent);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      intent = { action: 'unknown', service: 'unknown' };
    }

    const action = intent.action?.toLowerCase();
    const serviceName = intent.service?.toLowerCase();

    console.log('Extracted - Action:', action, 'Service:', serviceName);

    // Generate response based on extracted info
    let response = '';
    let hasSteps = false;
    let providerUrl = null;

    if (action === 'unknown' && serviceName === 'unknown') {
      response = "I'd be happy to help you with your subscription! Could you please tell me which service you'd like to cancel, pause, or renew?";
    } else if (serviceName === 'unknown') {
      response = `I understand you want to ${action} a subscription. Which service would you like to ${action}?`;
    } else if (action === 'unknown') {
      response = `I can help you with ${serviceName}. Would you like to cancel, pause, or renew your ${serviceName} subscription?`;
    } else {
      const providerInfo = PROVIDER_INFO[serviceName];

      if (action === 'pause') {
        if (!providerInfo) {
          response = `I don't have specific information about pausing subscriptions for ${serviceName}. I recommend checking their website or app for pause options in your subscription settings.`;
        } else if (!providerInfo.allowsPause) {
          response = `Unfortunately, ${serviceName} does not allow pausing subscriptions. You can only cancel or keep it active. Would you like help with canceling instead?`;
        } else if (providerInfo.pauseSteps) {
          response = `Here's how to pause your ${serviceName} subscription:\n\n${providerInfo.pauseSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
          hasSteps = true;
          providerUrl = providerInfo.url || null;
        }
      } else if (action === 'cancel') {
        if (!providerInfo || !providerInfo.cancelSteps) {
          response = `I don't have specific cancellation steps for ${serviceName}. Here's a general approach:\n\n1. Open the provider's app or website\n2. Navigate to Billing or Subscription settings\n3. Look for 'Manage Subscription' or 'Cancel'\n4. Follow the cancellation flow\n5. Save any confirmation emails`;
          hasSteps = true;
        } else {
          response = `Here's how to cancel your ${serviceName} subscription:\n\n${providerInfo.cancelSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
          hasSteps = true;
          providerUrl = providerInfo.url || null;
        }
      } else if (action === 'renew') {
        if (!providerInfo || !providerInfo.renewSteps) {
          response = `I don't have specific renewal steps for ${serviceName}. Generally, you can:\n\n1. Open the provider's app or website\n2. Navigate to your subscription settings\n3. Look for 'Renew' or 'Reactivate'\n4. Complete the payment process`;
          hasSteps = true;
        } else {
          response = `Here's how to renew your ${serviceName} subscription:\n\n${providerInfo.renewSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
          hasSteps = true;
          providerUrl = providerInfo.url || null;
        }
      }
    }

    return new Response(
      JSON.stringify({
        response,
        hasSteps,
        providerUrl,
        action,
        service: serviceName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in subscription-assistant function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
