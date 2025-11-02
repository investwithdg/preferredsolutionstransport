# Vercel Driver Login Debugging Guide

## Overview
This guide helps debug driver login issues on Vercel deployments.

## Common Issues and Solutions

### Issue 1: ERR_FAILED or Error Page After Login

**Root Cause:** Session cookies not being properly transferred during OAuth callback redirects.

**Solution:** The OAuth callback route has been updated to:
1. Use `NextResponse.next()` initially to allow cookie mutations during session exchange
2. Copy all session cookies to the redirect response before returning

### Issue 2: Environment Variables

**Check these variables in Vercel:**

1. **NEXT_PUBLIC_SITE_URL** - Must be set to your Vercel deployment URL
   ```
   Example: https://your-app.vercel.app
   ```

2. **NEXT_PUBLIC_SUPABASE_URL** - Your Supabase project URL
   ```
   Example: https://xxxxx.supabase.co
   ```

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Your Supabase anon/public key

4. **SUPABASE_SERVICE_ROLE_KEY** - Your Supabase service role key (keep secret!)

### Issue 3: Supabase OAuth Configuration

**In your Supabase project, verify:**

1. Go to Authentication > URL Configuration
2. Add your Vercel URL to **Site URL**:
   ```
   https://your-app.vercel.app
   ```

3. Add callback URL to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```

### Issue 4: Google OAuth Configuration

**In Google Cloud Console:**

1. Go to APIs & Services > Credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```

## How to Debug

### Step 1: Check Vercel Logs

1. Go to your Vercel dashboard
2. Select your deployment
3. Click on "Functions" tab
4. Look for logs from `/api/auth/callback`
5. Search for lines starting with `[Auth Callback Debug]`

### Step 2: Key Log Messages to Look For

**Successful flow:**
```
[Auth Callback Debug] Code: Present
[Auth Callback Debug] Role: driver
[Auth Callback Debug] Exchanging code for session...
[Auth Callback Debug] Session user found: [user-id] [email]
[Auth Callback Debug] Creating user with role: driver
[Auth Callback Debug] Driver record created successfully
[Auth Callback Debug] Redirecting to: /driver for role: driver
```

**Common error patterns:**

- `Code exchange error` - Check Supabase OAuth configuration
- `Error creating user record` - Check database permissions/RLS policies
- `Error creating driver record` - Check drivers table exists and RLS allows inserts
- `No session user after exchange` - OAuth code was invalid or expired

### Step 3: Test the Flow

1. Clear all browser cookies for your Vercel site
2. Navigate to: `https://your-app.vercel.app/auth/sign-in`
3. Select "Driver" from the role dropdown
4. Click "Continue with Google"
5. Complete Google authentication
6. Watch Vercel logs for the callback execution

### Step 4: Verify Database State

After attempting login, check your Supabase database:

```sql
-- Check if user record was created
SELECT * FROM users WHERE email = 'your-test-email@gmail.com';

-- Check if driver record was created
SELECT * FROM drivers WHERE user_id = 'the-auth-id-from-above';
```

## Known Limitations

1. **Cookie Size**: Very large sessions might hit cookie size limits
2. **Redirect Loops**: If middleware and callback both redirect, you might loop
3. **CORS Issues**: Make sure Supabase allows requests from your Vercel domain

## Quick Fixes

### If you keep landing on error page:

1. Check Vercel logs for the actual error message
2. Verify `NEXT_PUBLIC_SITE_URL` is set correctly
3. Make sure Supabase redirect URLs include your Vercel domain
4. Try incognito/private browsing to rule out cookie issues

### If session exists but /driver page shows login:

This means cookies aren't being read properly:
1. Check middleware.ts logic
2. Verify cookie names match between callback and middleware
3. Check cookie domain/path settings

## Contact Support

If issues persist after following this guide:
1. Export Vercel function logs
2. Check Supabase logs in Dashboard > Logs
3. Document the exact error message or behavior
4. Note which step in the flow fails
