# Technical Documentation - Subscription Management App

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Data Flows](#data-flows)
5. [Authentication](#authentication)
6. [Webhooks & Automation](#webhooks--automation)
7. [Frontend Routes](#frontend-routes)

---

## Architecture Overview

### Technology Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: @tanstack/react-query (TanStack Query)
- **Routing**: React Router v6
- **AI Integration**: Lovable AI Gateway for subscription assistance

### Architecture Pattern
```
┌─────────────────┐
│   React SPA     │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌────────────────┐    ┌────────────────┐
│   Supabase     │    │  Edge          │
│   PostgreSQL   │◄───│  Functions     │
│   Database     │    │  (Deno)        │
└────────────────┘    └────────┬───────┘
                               │
                               ▼
                      ┌────────────────┐
                      │  External APIs │
                      │  - AI Gateway  │
                      │  - n8n         │
                      └────────────────┘
```

---

## Database Schema

### Tables

#### 1. `subscriptions`
Stores user subscription data.

**Schema:**
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,
  next_billing_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  category TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Fields:**
- `id` - Unique subscription identifier
- `user_id` - Links to authenticated user
- `name` - Subscription service name
- `provider` - Service provider (Netflix, Spotify, etc.)
- `amount` - Billing amount
- `currency` - Currency code (default: USD)
- `billing_cycle` - monthly, yearly, weekly
- `next_billing_date` - Next charge date
- `status` - active, paused, canceled
- `category` - Entertainment, Productivity, etc.
- `payment_method` - Credit Card, UPI, etc.
- `notes` - User notes
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**RLS Policies:**
- Users can only view/edit their own subscriptions
- All operations scoped to `auth.uid()`

---

#### 2. `n8n_webhooks`
Manages webhook configurations for n8n automation.

**Schema:**
```sql
CREATE TABLE public.n8n_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Fields:**
- `id` - Unique webhook identifier
- `user_id` - Webhook owner
- `webhook_url` - n8n webhook endpoint URL
- `webhook_name` - User-friendly name
- `event_type` - Event trigger (see below)
- `is_active` - Enable/disable webhook
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Event Types:**
- `subscription_added` - New subscription created
- `subscription_updated` - Subscription modified
- `subscription_deleted` - Subscription removed
- `subscription_renewed` - Subscription renewed
- `payment_reminder` - Payment reminder triggered

**RLS Policies:**
- Users can only manage their own webhooks
- Full CRUD operations scoped to user_id

---

### Database Functions

#### `update_updated_at_column()`
Automatically updates `updated_at` timestamp on row modification.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

**Attached to:**
- `subscriptions` table
- `n8n_webhooks` table

---

## API Endpoints

### Edge Functions

#### 1. **subscription-assistant**
AI-powered subscription management assistant.

**Endpoint:** `https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/subscription-assistant`

**Method:** POST

**Authentication:** None (verify_jwt = false)

**Request Body:**
```json
{
  "message": "I want to cancel Netflix"
}
```

**Response:**
```json
{
  "response": "Here's how to cancel your Netflix subscription...",
  "hasSteps": true,
  "providerUrl": "https://www.netflix.com/cancelplan",
  "action": "cancel",
  "service": "netflix"
}
```

**Supported Providers:**
- Netflix
- Spotify
- Amazon Prime
- YouTube Premium
- Apple Music (detection only)

**Supported Actions:**
- `cancel` - Cancellation instructions
- `pause` - Pause subscription
- `renew` - Renewal instructions

**Data Flow:**
```
User Input → Edge Function → AI Gateway (Lovable) → 
Provider Info Lookup → Formatted Response
```

**CORS Headers:**
```javascript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

---

#### 2. **trigger-n8n-webhook**
Triggers configured n8n webhooks for subscription events.

**Endpoint:** `https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/trigger-n8n-webhook`

**Method:** POST

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "eventType": "subscription_added",
  "eventData": {
    "subscriptionId": "uuid",
    "name": "Netflix",
    "amount": 15.99,
    "nextBillingDate": "2025-11-14"
  }
}
```

**Response:**
```json
{
  "message": "Webhooks triggered",
  "triggered": 2,
  "failed": 0,
  "results": [
    {
      "status": "fulfilled",
      "value": {
        "webhook": "My Workflow",
        "status": "success"
      }
    }
  ]
}
```

**Webhook Payload Sent to n8n:**
```json
{
  "eventType": "subscription_added",
  "eventData": { /* user-provided data */ },
  "timestamp": "2025-10-14T12:00:00.000Z",
  "userId": "user-uuid"
}
```

**Error Handling:**
- Returns 401 if unauthorized
- Returns 500 on webhook trigger failure
- Logs all webhook responses

---

### Supabase Client API

#### Authentication
```typescript
import { supabase } from "@/integrations/supabase/client";

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

#### Subscriptions CRUD

**Read:**
```typescript
const { data, error } = await supabase
  .from("subscriptions")
  .select("*")
  .eq("user_id", user.id)
  .order("next_billing_date", { ascending: true });
```

**Create:**
```typescript
const { error } = await supabase
  .from("subscriptions")
  .insert({
    user_id: user.id,
    name: "Netflix",
    provider: "Netflix",
    amount: 15.99,
    billing_cycle: "monthly",
    next_billing_date: "2025-11-14"
  });
```

**Update:**
```typescript
const { error } = await supabase
  .from("subscriptions")
  .update({ status: "paused" })
  .eq("id", subscriptionId);
```

**Delete:**
```typescript
const { error } = await supabase
  .from("subscriptions")
  .delete()
  .eq("id", subscriptionId);
```

#### Webhooks CRUD

**Read All:**
```typescript
const { data, error } = await supabase
  .from("n8n_webhooks")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```

**Create:**
```typescript
const { error } = await supabase
  .from("n8n_webhooks")
  .insert({
    user_id: user.id,
    webhook_name: "My Workflow",
    webhook_url: "https://n8n.example.com/webhook/abc123",
    event_type: "subscription_added"
  });
```

**Toggle Active:**
```typescript
const { error } = await supabase
  .from("n8n_webhooks")
  .update({ is_active: !currentState })
  .eq("id", webhookId);
```

**Delete:**
```typescript
const { error } = await supabase
  .from("n8n_webhooks")
  .delete()
  .eq("id", webhookId);
```

---

## Data Flows

### 1. Subscription Creation Flow

```
User Input (AddManual page)
    ↓
Form Validation
    ↓
Supabase Insert Query
    ↓
Database: subscriptions table
    ↓
Trigger: n8n webhook (if configured)
    ↓
Edge Function: trigger-n8n-webhook
    ↓
External: n8n automation
    ↓
Success Toast → Navigate to Dashboard
```

### 2. AI Assistant Flow

```
User Message (LLMAssistant page)
    ↓
POST /functions/v1/subscription-assistant
    ↓
Edge Function Processes Request
    ↓
Call AI Gateway (Lovable)
    ↓
Extract Action & Service
    ↓
Lookup Provider Info
    ↓
Format Response with Steps
    ↓
Return to Frontend
    ↓
Display in Chat UI
```

### 3. SMS Sync Flow (Mock)

```
User Clicks Refresh Button
    ↓
handleSyncSubscriptions() called
    ↓
Set isSyncing = true
    ↓
Simulate 1.5s delay
    ↓
loadSubscriptions() from Supabase
    ↓
Update UI with fresh data
    ↓
Success Toast
    ↓
Set isSyncing = false
```

### 4. Webhook Trigger Flow

```
Subscription Event (add/update/delete)
    ↓
App calls trigger-n8n-webhook function
    ↓
Authenticate User (JWT)
    ↓
Query active webhooks for event_type
    ↓
Parallel fetch to all webhook URLs
    ↓
Send event payload to n8n
    ↓
n8n workflow executes
    ↓
Return results to app
```

---

## Authentication

### Implementation
- **Provider:** Supabase Auth
- **Storage:** localStorage (persistent sessions)
- **Auto-refresh:** Enabled
- **Current State:** Development mode (no actual auth implemented)

### Planned Auth Flow
```typescript
// Sign Up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign Out
await supabase.auth.signOut();

// Auth State Change
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
});
```

### RLS Security
All tables enforce Row Level Security (RLS):
```sql
-- Example policy
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);
```

---

## Webhooks & Automation

### n8n Integration

**Setup:**
1. User creates webhook in n8n workflow
2. Copy webhook URL from n8n
3. Add webhook in app Settings → n8n Webhooks
4. Configure event type
5. Enable webhook

**Webhook Payload Structure:**
```json
{
  "eventType": "subscription_added | subscription_updated | subscription_deleted | subscription_renewed | payment_reminder",
  "eventData": {
    "subscriptionId": "uuid",
    "name": "Service Name",
    "provider": "Provider Name",
    "amount": 0.00,
    "currency": "USD",
    "billingCycle": "monthly",
    "nextBillingDate": "YYYY-MM-DD",
    "status": "active | paused | canceled"
  },
  "timestamp": "ISO 8601 timestamp",
  "userId": "user-uuid"
}
```

**n8n Workflow Example:**
```
Webhook Trigger
    ↓
Check Event Type
    ↓
[If subscription_added]
    ↓
Send Slack Notification
    ↓
Update Google Sheets
    ↓
Create Calendar Event
```

---

## Frontend Routes

### Route Structure

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/` | Welcome | Landing page | No |
| `/otp` | OTP | OTP verification | No |
| `/profile-setup` | ProfileSetup | User onboarding | No |
| `/action-select` | ActionSelect | Choose setup method | No |
| `/sms-permission` | SmsPermission | Request SMS access | No |
| `/auto-sync` | AutoSync | SMS scanning | No |
| `/add-manual` | AddManual | Manual subscription entry | No |
| `/confirm-detected` | ConfirmDetected | Confirm auto-detected subs | No |
| `/dashboard` | Dashboard | Main subscription list | Yes* |
| `/settings` | Settings | App settings | Yes* |
| `/edit-subscription/:id` | EditSubscription | Edit subscription | Yes* |
| `/llm-assistant` | LLMAssistant | AI chat assistant | No |
| `/n8n-webhooks` | N8nWebhooks | Manage webhooks | Yes* |

*Auth planned but not enforced in current implementation

### Navigation Components

**BottomNav:**
- Dashboard (Home icon)
- Settings (Settings icon)
- AI Assistant (Bot icon)

**BackButton:**
- Available on most pages
- Uses `useNavigate(-1)`

---

## State Management

### Local Storage Keys
```typescript
// User data
localStorage.setItem("userName", string);
localStorage.setItem("phone", string);

// Subscriptions (mock data)
localStorage.setItem("subscriptions", JSON.stringify(array));

// Settings
localStorage.setItem("pushNotifications", boolean);
localStorage.setItem("globalReminderEnabled", boolean);
localStorage.setItem("globalReminderDays", string);
localStorage.setItem("scanFrequency", number);
localStorage.setItem("smsAccessEnabled", boolean);
```

### React Query
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
```

---

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://gatjokqfnstxfmgxmjsf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
VITE_SUPABASE_PROJECT_ID=gatjokqfnstxfmgxmjsf
```

### Edge Functions (Deno.env)
```typescript
Deno.env.get('SUPABASE_URL')
Deno.env.get('SUPABASE_ANON_KEY')
Deno.env.get('LOVABLE_API_KEY') // For AI Gateway
```

---

## Error Handling

### Frontend Patterns
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  // Success handling
} catch (error) {
  console.error('Error:', error);
  toast.error('Operation failed');
}
```

### Edge Function Patterns
```typescript
try {
  // Function logic
} catch (error) {
  console.error('Error:', error);
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Unknown error occurred';
  return new Response(
    JSON.stringify({ error: errorMessage }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## Security Considerations

### Current Implementation
- RLS enabled on all tables
- JWT authentication for protected edge functions
- CORS configured for edge functions
- User-scoped data access

### Recommendations for Production
1. Enable email confirmation for signups
2. Implement rate limiting on edge functions
3. Add input validation with Zod
4. Sanitize user inputs
5. Enable MFA for user accounts
6. Add webhook signature verification
7. Implement API key rotation
8. Add monitoring and logging

---

## Performance Optimizations

### Current Implementations
- React Query caching (5-minute stale time)
- Lazy loading with React.lazy (if implemented)
- Database indexes on user_id columns
- Optimistic UI updates

### Recommended Additions
- Image lazy loading
- Virtual scrolling for long subscription lists
- Service worker for offline support
- CDN for static assets
- Database connection pooling

---

## Monitoring & Debugging

### Available Tools
1. **Supabase Dashboard** - Database logs, auth logs
2. **Browser DevTools** - Network, Console
3. **React Query DevTools** - Cache inspection
4. **Edge Function Logs** - Deno runtime logs

### Logging Strategy
```typescript
// Frontend
console.log('[INFO]', message);
console.error('[ERROR]', error);

// Edge Function
console.log('Processing:', data);
console.error('Error occurred:', error);
```

---

## Deployment

### Current Setup
- **Frontend:** Lovable Cloud (automatic)
- **Backend:** Supabase Cloud
- **Edge Functions:** Auto-deployed with code changes

### Build Process
```bash
# Frontend
npm run build
# Outputs to /dist

# Edge Functions
# Auto-deployed via Supabase CLI integration
```

---

## Future Enhancements

### Planned Features
1. Real authentication system
2. SMS parsing integration
3. Recurring payment detection
4. Spending analytics dashboard
5. Multiple payment method support
6. Family plan sharing
7. Price change alerts
8. Subscription recommendations

### Technical Debt
1. Replace localStorage with Supabase storage
2. Implement proper error boundaries
3. Add E2E testing (Playwright)
4. Add unit tests (Vitest)
5. Implement proper auth flow
6. Add data migration scripts

---

## Support & Resources

### Documentation Links
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [n8n Docs](https://docs.n8n.io/)
- [Lovable Docs](https://docs.lovable.dev/)

### API Versioning
- Supabase REST API: v1
- Edge Functions: Custom (no versioning)
- Frontend: v1.0.0 (implied)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Maintained By:** Development Team