# API Documentation - Subscription Management App

## Base URLs

**Supabase Project:** `https://gatjokqfnstxfmgxmjsf.supabase.co`

**Edge Functions Base:** `https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1`

**Database REST API:** `https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1`

---

## Authentication

### Headers Required

#### For Edge Functions (when verify_jwt = true)
```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

#### For Database REST API
```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
Prefer: return=representation
```

---

## Edge Functions

### 1. Subscription Assistant

Get AI-powered help for managing subscriptions.

#### Endpoint
```http
POST /functions/v1/subscription-assistant
```

#### Authentication
Not required (public endpoint)

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "message": "string (required)"
}
```

#### Example Requests

**Cancel Netflix:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/subscription-assistant' \
  -H 'Content-Type: application/json' \
  -d '{"message": "I want to cancel Netflix"}'
```

**Pause Spotify:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/subscription-assistant' \
  -H 'Content-Type: application/json' \
  -d '{"message": "How do I pause my Spotify subscription?"}'
```

**Renew Amazon Prime:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/subscription-assistant' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Renew Amazon Prime"}'
```

#### Response Schema
```typescript
{
  response: string;        // AI-generated response text
  hasSteps: boolean;       // Whether step-by-step instructions are provided
  providerUrl: string | null;  // Direct URL to provider's management page
  action: string;          // Detected action: "cancel" | "pause" | "renew"
  service: string;         // Detected service name
}
```

#### Success Response Examples

**With Steps & URL:**
```json
{
  "response": "Here's how to cancel your Netflix subscription:\n\n1. Open Netflix app or visit netflix.com\n2. Go to Account settings\n3. Click 'Cancel Membership'\n4. Confirm cancellation",
  "hasSteps": true,
  "providerUrl": "https://www.netflix.com/cancelplan",
  "action": "cancel",
  "service": "netflix"
}
```

**With Generic Steps:**
```json
{
  "response": "I don't have specific cancellation steps for apple music. Generally, you can:\n\n1. Open the provider's app or website\n2. Navigate to your subscription settings\n3. Look for 'Cancel' or 'Manage Subscription'\n4. Follow the prompts to cancel",
  "hasSteps": true,
  "providerUrl": null,
  "action": "cancel",
  "service": "apple music"
}
```

**No Pause Available:**
```json
{
  "response": "Unfortunately, netflix doesn't offer a pause feature. You would need to cancel and resubscribe later.",
  "hasSteps": false,
  "providerUrl": null,
  "action": "pause",
  "service": "netflix"
}
```

#### Error Response
```json
{
  "error": "string"
}
```

#### Status Codes
- `200` - Success
- `500` - Internal server error

#### Supported Providers

| Provider | Cancel | Pause | Renew | Direct URL |
|----------|--------|-------|-------|------------|
| Netflix | ✅ | ❌ | ✅ | ✅ |
| Spotify | ✅ | ✅ | ✅ | ✅ |
| Amazon Prime | ✅ | ❌ | ✅ | ✅ |
| YouTube Premium | ✅ | ❌ | ✅ | ✅ |
| Apple Music | ✅ | ❌ | ✅ | ❌ |
| Others | Generic | Generic | Generic | ❌ |

---

### 2. Trigger n8n Webhook

Trigger configured n8n webhooks for subscription events.

#### Endpoint
```http
POST /functions/v1/trigger-n8n-webhook
```

#### Authentication
**Required:** JWT Bearer token

#### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

#### Request Body
```json
{
  "eventType": "string (required)",
  "eventData": "object (required)"
}
```

#### Event Types
- `subscription_added`
- `subscription_updated`
- `subscription_deleted`
- `subscription_renewed`
- `payment_reminder`

#### Example Requests

**Subscription Added:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/trigger-n8n-webhook' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "eventType": "subscription_added",
    "eventData": {
      "subscriptionId": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Netflix",
      "provider": "Netflix",
      "amount": 15.99,
      "currency": "USD",
      "billingCycle": "monthly",
      "nextBillingDate": "2025-11-14",
      "status": "active"
    }
  }'
```

**Subscription Updated:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/trigger-n8n-webhook' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "eventType": "subscription_updated",
    "eventData": {
      "subscriptionId": "123e4567-e89b-12d3-a456-426614174000",
      "changes": {
        "status": "paused"
      }
    }
  }'
```

**Payment Reminder:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/functions/v1/trigger-n8n-webhook' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "eventType": "payment_reminder",
    "eventData": {
      "subscriptionId": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Spotify",
      "amount": 9.99,
      "daysUntilBilling": 3,
      "nextBillingDate": "2025-10-17"
    }
  }'
```

#### Response Schema
```typescript
{
  message: string;         // Status message
  triggered: number;       // Number of webhooks triggered successfully
  failed: number;          // Number of webhooks that failed
  results: Array<{         // Detailed results for each webhook
    status: "fulfilled" | "rejected";
    value?: {
      webhook: string;     // Webhook name
      status: string;      // "success"
    };
    reason?: string;       // Error reason if rejected
  }>;
}
```

#### Success Response Examples

**All Webhooks Triggered:**
```json
{
  "message": "Webhooks triggered",
  "triggered": 2,
  "failed": 0,
  "results": [
    {
      "status": "fulfilled",
      "value": {
        "webhook": "Slack Notification",
        "status": "success"
      }
    },
    {
      "status": "fulfilled",
      "value": {
        "webhook": "Google Sheets Update",
        "status": "success"
      }
    }
  ]
}
```

**Partial Failure:**
```json
{
  "message": "Webhooks triggered",
  "triggered": 1,
  "failed": 1,
  "results": [
    {
      "status": "fulfilled",
      "value": {
        "webhook": "Working Webhook",
        "status": "success"
      }
    },
    {
      "status": "rejected",
      "reason": "Webhook Failed Webhook failed: Internal Server Error"
    }
  ]
}
```

**No Active Webhooks:**
```json
{
  "message": "No active webhooks found",
  "triggered": 0
}
```

#### Webhook Payload Sent to n8n

The function sends this payload to each configured webhook:

```json
{
  "eventType": "subscription_added",
  "eventData": {
    // Your provided eventData
  },
  "timestamp": "2025-10-14T12:00:00.000Z",
  "userId": "user-uuid"
}
```

#### Error Response
```json
{
  "error": "string"
}
```

#### Status Codes
- `200` - Success (includes partial failures)
- `401` - Unauthorized (missing or invalid JWT)
- `500` - Internal server error

---

## Database REST API

### Base Endpoint
```
https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1
```

### Authentication
All database operations require authentication via RLS policies.

### Common Headers
```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
Prefer: return=representation
```

---

### Subscriptions Table

#### 1. Get All Subscriptions

```http
GET /rest/v1/subscriptions?select=*&user_id=eq.<USER_ID>
```

**Example:**
```bash
curl -X GET 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/subscriptions?select=*&order=next_billing_date.asc' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>'
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Netflix",
    "provider": "Netflix",
    "amount": 15.99,
    "currency": "USD",
    "billing_cycle": "monthly",
    "next_billing_date": "2025-11-14",
    "status": "active",
    "category": "Entertainment",
    "payment_method": "Credit Card",
    "notes": "Family plan",
    "created_at": "2025-10-14T12:00:00Z",
    "updated_at": "2025-10-14T12:00:00Z"
  }
]
```

#### 2. Get Single Subscription

```http
GET /rest/v1/subscriptions?id=eq.<SUBSCRIPTION_ID>&select=*
```

**Example:**
```bash
curl -X GET 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/subscriptions?id=eq.123e4567-e89b-12d3-a456-426614174000&select=*' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>'
```

#### 3. Create Subscription

```http
POST /rest/v1/subscriptions
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "name": "Netflix",
  "provider": "Netflix",
  "amount": 15.99,
  "currency": "USD",
  "billing_cycle": "monthly",
  "next_billing_date": "2025-11-14",
  "status": "active",
  "category": "Entertainment",
  "payment_method": "Credit Card",
  "notes": "Family plan"
}
```

**Example:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/subscriptions' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "user_id": "uuid",
    "name": "Netflix",
    "provider": "Netflix",
    "amount": 15.99,
    "billing_cycle": "monthly",
    "next_billing_date": "2025-11-14"
  }'
```

#### 4. Update Subscription

```http
PATCH /rest/v1/subscriptions?id=eq.<SUBSCRIPTION_ID>
```

**Request Body:**
```json
{
  "status": "paused",
  "notes": "Paused for the holidays"
}
```

**Example:**
```bash
curl -X PATCH 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/subscriptions?id=eq.123e4567' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{"status": "paused"}'
```

#### 5. Delete Subscription

```http
DELETE /rest/v1/subscriptions?id=eq.<SUBSCRIPTION_ID>
```

**Example:**
```bash
curl -X DELETE 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/subscriptions?id=eq.123e4567' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>'
```

---

### n8n Webhooks Table

#### 1. Get All Webhooks

```http
GET /rest/v1/n8n_webhooks?select=*&user_id=eq.<USER_ID>
```

**Example:**
```bash
curl -X GET 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/n8n_webhooks?select=*&order=created_at.desc' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>'
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "webhook_url": "https://n8n.example.com/webhook/abc123",
    "webhook_name": "Slack Notification",
    "event_type": "subscription_added",
    "is_active": true,
    "created_at": "2025-10-14T12:00:00Z",
    "updated_at": "2025-10-14T12:00:00Z"
  }
]
```

#### 2. Create Webhook

```http
POST /rest/v1/n8n_webhooks
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "webhook_url": "https://n8n.example.com/webhook/abc123",
  "webhook_name": "My Workflow",
  "event_type": "subscription_added"
}
```

**Example:**
```bash
curl -X POST 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/n8n_webhooks' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "user_id": "uuid",
    "webhook_url": "https://n8n.example.com/webhook/abc123",
    "webhook_name": "Slack Notification",
    "event_type": "subscription_added"
  }'
```

#### 3. Update Webhook

```http
PATCH /rest/v1/n8n_webhooks?id=eq.<WEBHOOK_ID>
```

**Toggle Active:**
```json
{
  "is_active": false
}
```

**Example:**
```bash
curl -X PATCH 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/n8n_webhooks?id=eq.123e4567' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"is_active": false}'
```

#### 4. Delete Webhook

```http
DELETE /rest/v1/n8n_webhooks?id=eq.<WEBHOOK_ID>
```

**Example:**
```bash
curl -X DELETE 'https://gatjokqfnstxfmgxmjsf.supabase.co/rest/v1/n8n_webhooks?id=eq.123e4567' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'apikey: <SUPABASE_ANON_KEY>'
```

---

## Query Parameters

### Filtering
```
?column=eq.value          # Equal
?column=neq.value         # Not equal
?column=gt.value          # Greater than
?column=gte.value         # Greater than or equal
?column=lt.value          # Less than
?column=lte.value         # Less than or equal
?column=like.*pattern*    # Pattern matching
?column=ilike.*pattern*   # Case-insensitive pattern
?column=is.null           # Is null
?column=is.true           # Is true
?column=is.false          # Is false
?column=in.(value1,value2) # In list
```

### Ordering
```
?order=column.asc         # Ascending
?order=column.desc        # Descending
```

### Limiting
```
?limit=10                 # Limit to 10 rows
?offset=20                # Skip first 20 rows
```

### Selecting Columns
```
?select=*                 # All columns
?select=id,name,amount    # Specific columns
```

### Examples

**Get active subscriptions under $20:**
```bash
GET /rest/v1/subscriptions?status=eq.active&amount=lt.20&select=*
```

**Get webhooks for specific event:**
```bash
GET /rest/v1/n8n_webhooks?event_type=eq.subscription_added&is_active=eq.true
```

**Get next 3 billing dates:**
```bash
GET /rest/v1/subscriptions?select=name,next_billing_date&order=next_billing_date.asc&limit=3
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden (RLS policy violation) |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## Rate Limits

Currently no rate limits enforced. Recommended for production:

- Edge Functions: 100 requests/minute per IP
- REST API: 1000 requests/minute per user
- Webhook triggers: 50 requests/minute per user

---

## Testing with Postman/Insomnia

### Collection Setup

**Base Variables:**
```json
{
  "base_url": "https://gatjokqfnstxfmgxmjsf.supabase.co",
  "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Global Headers:**
```json
{
  "apikey": "{{anon_key}}",
  "Authorization": "Bearer {{jwt_token}}",
  "Content-Type": "application/json"
}
```

---

## SDK Usage Examples

### JavaScript/TypeScript (Supabase Client)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gatjokqfnstxfmgxmjsf.supabase.co',
  'ANON_KEY'
);

// Get subscriptions
const { data, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('status', 'active');

// Create subscription
const { data, error } = await supabase
  .from('subscriptions')
  .insert({
    name: 'Netflix',
    amount: 15.99,
    // ...
  });

// Call edge function
const { data, error } = await supabase.functions.invoke(
  'subscription-assistant',
  {
    body: { message: 'Cancel Netflix' }
  }
);
```

---

## Webhooks Integration Guide

### n8n Webhook Setup

1. **Create Webhook Node in n8n:**
   - Add "Webhook" trigger node
   - Set HTTP Method: POST
   - Copy the webhook URL

2. **Configure in App:**
   - Navigate to Settings → n8n Webhooks
   - Click "Add Webhook"
   - Enter webhook name and URL
   - Select event type
   - Enable webhook

3. **Test:**
   - Trigger the event (e.g., add subscription)
   - Check n8n workflow execution

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "subscription-events"
      }
    },
    {
      "name": "Switch Event Type",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "string": [
                  {
                    "value1": "={{$json.eventType}}",
                    "value2": "subscription_added"
                  }
                ]
              }
            }
          ]
        }
      }
    },
    {
      "name": "Send Slack Message",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#subscriptions",
        "text": "New subscription added: {{$json.eventData.name}}"
      }
    }
  ]
}
```

---

## Changelog

### Version 1.0 (2025-10-14)
- Initial API documentation
- Subscription Assistant endpoint
- n8n Webhook trigger endpoint
- Database REST API documentation
- Complete examples and schemas

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**API Version:** v1