# SMS Provider Configuration Guide

## Overview
The phone authentication system uses Supabase's built-in phone auth, which requires an SMS provider to send OTP codes to users' mobile numbers.

## How It Works

### 1. User Flow
```
User enters phone → OTP generated → SMS sent → User enters OTP → Verified → Authenticated
```

### 2. Technical Flow
```
Welcome.tsx (signInWithOtp)
    ↓
Supabase Backend
    ↓
[Generates random OTP]
    ↓
SMS Provider (Twilio/MessageBird/Vonage/Textlocal)
    ↓
User's Phone (receives SMS)
    ↓
OTP.tsx (verifyOtp)
    ↓
Session Created
```

## SMS Provider Configuration (Backend Setup)

**IMPORTANT**: SMS provider configuration is done in the backend settings, NOT in code.

### Steps to Configure:

1. **Access Backend Settings**
   - Click the "View Backend" button in the chat
   - Navigate to: **Authentication → Providers → Phone**

2. **Enable Phone Provider**
   - Toggle "Enable Phone Sign-up"

3. **Choose and Configure SMS Provider**

   You can choose from these providers:

   #### Option A: Twilio (Recommended)
   - Sign up at: https://www.twilio.com
   - Get credentials:
     - Account SID
     - Auth Token
     - Phone Number (sender)
   - Enter in backend settings

   #### Option B: MessageBird
   - Sign up at: https://www.messagebird.com
   - Get API Key
   - Configure sender ID
   - Enter in backend settings

   #### Option C: Vonage (formerly Nexmo)
   - Sign up at: https://www.vonage.com
   - Get API Key and Secret
   - Enter in backend settings

   #### Option D: Textlocal (India-specific)
   - Sign up at: https://www.textlocal.in
   - Get API Key
   - Best for Indian phone numbers
   - Enter in backend settings

4. **Configure Settings**
   - OTP expiry time: Default 60 seconds
   - OTP length: Typically 6 digits
   - Rate limiting: Max requests per phone number

5. **Test Configuration**
   - Use test mode if available
   - Send test OTP to your own phone
   - Verify it works before going live

## Code Implementation

The code is already implemented and ready to use. Once SMS provider is configured in backend:

### Welcome.tsx (Sending OTP)
```typescript
// Formats phone to E.164 format (+91XXXXXXXXXX)
const formattedPhone = `+91${phone}`;

// Triggers OTP generation and SMS sending
await supabase.auth.signInWithOtp({
  phone: formattedPhone,
});
```

### OTP.tsx (Verifying OTP)
```typescript
// Validates user-entered OTP
await supabase.auth.verifyOtp({
  phone: formattedPhone,
  token: otpCode,
  type: 'sms'
});
```

## Cost Considerations

- **Twilio**: ~$0.0075 per SMS (varies by country)
- **MessageBird**: ~$0.06 per SMS (varies by country)
- **Vonage**: ~$0.0057 per SMS (varies by country)
- **Textlocal**: ~₹0.15-0.25 per SMS (India)

## Security Features

1. **Rate Limiting**: Prevents spam (max 1 OTP/60s per phone)
2. **OTP Expiry**: Codes expire after 60 seconds
3. **Single Use**: Each OTP can only be used once
4. **Hashed Storage**: OTPs stored securely in backend

## Troubleshooting

### "SMS provider not configured" error
- SMS provider not set up in backend
- Go to backend settings and configure

### "Invalid phone number" error
- Phone must be in E.164 format (+91XXXXXXXXXX)
- Verify country code is correct

### "Rate limit exceeded" error
- Too many OTP requests
- Wait 60 seconds before requesting again

### OTP not received
- Check SMS provider balance/credits
- Verify phone number is correct
- Check SMS provider logs in their dashboard
- Ensure phone number is active and can receive SMS

## Testing in Development

Most SMS providers offer test/sandbox modes:
- **Twilio**: Test credentials for development
- **MessageBird**: Test API keys available
- Use your own phone number for initial testing
