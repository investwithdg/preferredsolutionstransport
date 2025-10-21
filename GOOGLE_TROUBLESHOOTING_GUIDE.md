# Google Integration Troubleshooting Guide

## Overview

This guide helps diagnose and fix issues with Google OAuth authentication and Google Maps API integration.

## Debug Tools Added

### 1. Debug Page

Visit `/debug/google` in your browser to access the comprehensive debug page that checks:

- Environment variable presence
- Google Maps API key validity
- Supabase connection status
- OAuth configuration
- Live testing of Maps and OAuth functionality

### 2. Enhanced Console Logging

Open your browser's Developer Console to see detailed debug information:

- **[Google OAuth Debug]** - OAuth flow information
- **[Auth Callback Debug]** - Callback processing details
- **[Google Maps Debug]** - Maps API loading status
- **[Sign In Debug]** - Authentication error details

## Common Issues and Solutions

### Google OAuth Not Working

#### 1. Check Supabase OAuth Configuration

**In Supabase Dashboard:**
1. Go to Authentication → Providers → Google
2. Ensure Google provider is **enabled**
3. Verify Client ID and Client Secret are correctly entered
4. Save the configuration

**In Google Cloud Console:**
1. Go to APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
   - For local development: `http://localhost:54321/auth/v1/callback`

#### 2. Check Supabase URL Configuration

**In Supabase Dashboard → Authentication → URL Configuration:**

```
Site URL: http://localhost:3000 (for development)
          https://your-domain.com (for production)

Redirect URLs:
- http://localhost:3000/auth/callback
- https://your-domain.com/auth/callback
```

#### 3. OAuth Consent Screen

**In Google Cloud Console:**
1. Go to APIs & Services → OAuth consent screen
2. Ensure it's configured and published (or in test mode with your email added)
3. Add required scopes: email, profile

#### 4. Common OAuth Errors

- **"OAuth is not properly configured"** - Google provider not enabled in Supabase
- **"Invalid redirect URI"** - Mismatch between Google Console and Supabase settings
- **"Access denied"** - User cancelled the sign-in process
- **"Server error"** - Check Supabase service status

### Google Maps Not Displaying

#### 1. Check API Key

```bash
# In your .env.local file:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

#### 2. Enable Required APIs

**In Google Cloud Console → APIs & Services → Library:**

Enable these APIs:
- Maps JavaScript API ✓
- Places API ✓
- Geocoding API (optional but recommended)

#### 3. Check API Key Restrictions

**In Google Cloud Console → APIs & Services → Credentials:**

1. Click on your API key
2. Under "Application restrictions":
   - For development: "None" or add `http://localhost:3000/*`
   - For production: Add your domain `https://your-domain.com/*`
3. Under "API restrictions":
   - Either "Don't restrict key" or
   - Select the specific APIs you enabled

#### 4. Billing Account

Ensure your Google Cloud project has a billing account attached. Google Maps requires billing to be enabled even for the free tier.

#### 5. Common Maps Errors

- **"InvalidKeyMapError"** - API key is invalid or deleted
- **"RefererNotAllowedMapError"** - Domain not in API key restrictions
- **"ApiNotActivatedMapError"** - Required APIs not enabled
- **"QuotaExceededError"** - API quota exceeded

## Testing Steps

### 1. Test Environment Variables

```bash
# Check if environment variables are loaded
npm run dev

# Visit /debug/google and check:
- Green checkmarks for all environment variables
- API key length should be 39 characters
```

### 2. Test Google Maps

1. Visit the home page
2. Check if address autocomplete appears in the form
3. Open Developer Console for any error messages
4. Try the "Test Map Creation" button on `/debug/google`

### 3. Test Google OAuth

1. Go to `/auth/sign-in`
2. Click "Sign in with Google"
3. Check Developer Console for debug logs
4. Complete the OAuth flow
5. Check if you're redirected properly

## Debug Information to Collect

When reporting issues, provide:

1. **Console Logs**: All logs with [Debug] tags
2. **Network Tab**: Failed requests (especially to googleapis.com)
3. **Debug Page Results**: Screenshot of `/debug/google`
4. **Error Messages**: Exact error text from UI or console

## Quick Fixes

### Clear Browser Cache
```bash
# Hard refresh
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

### Restart Next.js
```bash
# Stop the server and restart
npm run dev
```

### Check Supabase Status
Visit: https://status.supabase.com/

### Verify API Key Format
- Should be 39 characters long
- Format: `AIzaSy...` (starts with AIza)

## Still Having Issues?

1. Double-check all configuration steps
2. Ensure no typos in environment variables
3. Verify domain settings match between Google and Supabase
4. Check browser console for specific error messages
5. Test in incognito/private mode to rule out extensions

## Environment Variable Checklist

```env
# Required for Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza... (39 chars)

# Required for Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (long JWT token)
```

## Contact Support

If issues persist after following this guide:

1. Supabase Support: https://supabase.com/support
2. Google Cloud Support: https://cloud.google.com/support
3. Check application logs for server-side errors
