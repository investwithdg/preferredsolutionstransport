# Vercel Deployment Troubleshooting Guide

This guide will help you resolve the `ERR_FAILED` error and other deployment issues on Vercel.

## Common Issue: ERR_FAILED on Protected Routes

If you're seeing "This site can't be reached" with `ERR_FAILED` when accessing `/driver`, `/dispatcher`, `/admin`, or `/customer` routes, this is typically caused by **missing environment variables** on Vercel.

### Quick Diagnosis

1. **Visit the configuration check endpoint:**

   ```
   https://your-app.vercel.app/api/health/config
   ```

   This will show you which environment variables are missing or misconfigured.

2. **Check browser console:**
   Open DevTools (F12) and look for error messages in the Console tab.

3. **Check Vercel deployment logs:**
   - Go to your Vercel dashboard
   - Select your project
   - Click on "Deployments"
   - Click on the latest deployment
   - Check both "Build Logs" and "Function Logs"

---

## Step-by-Step Fix

### 1. Verify Environment Variables in Vercel

Go to your Vercel project dashboard and check that **all** of these critical variables are set:

#### Required for All Deployments:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Required for Google Maps Features:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
GOOGLE_MAPS_API_KEY=AIza...
```

#### Required for Web Push Notifications:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BF...
VAPID_PRIVATE_KEY=...
```

#### Optional but Recommended:

```bash
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...
HUBSPOT_WEBHOOK_SECRET=...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### 2. Set Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select "Production", "Preview", and "Development" (all three)
5. Click "Save"

### 3. Redeploy

After adding environment variables:

1. Go to "Deployments" tab
2. Click the three dots (...) on the latest deployment
3. Click "Redeploy"
4. Wait for the deployment to complete

**OR** push a new commit to trigger a deployment:

```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## Special Cases

### Demo Mode

If you want to test the application without authentication:

1. Set `NEXT_PUBLIC_DEMO_MODE=true` in Vercel environment variables
2. Redeploy
3. Visit the homepage and you'll see a demo mode banner

⚠️ **Never enable demo mode in production!**

### Supabase Redirect URLs

Make sure your Supabase project has the correct redirect URLs configured:

1. Go to your Supabase dashboard
2. Navigate to "Authentication" → "URL Configuration"
3. Add these redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://*.vercel.app/auth/callback
   https://your-production-domain.com/auth/callback
   ```

### Site URL Configuration

For production deployments, set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

⚠️ **Do NOT** manually set `VERCEL_URL` - Vercel sets this automatically.

---

## Testing the Fix

After redeploying:

1. **Test the config endpoint:**

   ```
   https://your-app.vercel.app/api/health/config
   ```

   Should return `"status": "healthy"`

2. **Test protected routes:**
   - Visit `https://your-app.vercel.app/driver`
   - Should redirect to sign-in (if not authenticated)
   - Should NOT show "ERR_FAILED"

3. **Test authentication:**
   - Sign in with a test account
   - Should be able to access role-specific dashboards

---

## Still Having Issues?

### Check Build Logs

1. Go to Vercel dashboard → Deployments
2. Click on the failed deployment
3. Check "Build Logs" for errors
4. Common issues:
   - TypeScript errors
   - Missing dependencies
   - Build timeouts

### Check Function Logs

1. Go to Vercel dashboard → Deployments
2. Click on the deployment
3. Check "Function Logs" tab
4. Look for runtime errors

### Common Error Messages

| Error                  | Cause                            | Solution                                    |
| ---------------------- | -------------------------------- | ------------------------------------------- |
| `ERR_FAILED`           | Missing env vars                 | Add required environment variables          |
| `NEXT_REDIRECT` error  | Middleware redirect loop         | Check middleware logic and role permissions |
| `Invalid Supabase URL` | Wrong or missing Supabase config | Verify Supabase URL and keys                |
| `Stripe error`         | Missing or invalid Stripe keys   | Check Stripe dashboard for correct keys     |
| Build timeout          | Large bundle or slow build       | Optimize imports and dependencies           |

### Enable Debug Logging

Temporarily enable more verbose logging by adding:

```bash
NODE_ENV=development
```

Then check the Function Logs for more detailed error messages.

---

## Quick Checklist

- [ ] All required environment variables are set in Vercel
- [ ] Environment variables are enabled for Production, Preview, AND Development
- [ ] Supabase redirect URLs include Vercel domain
- [ ] Redeployed after adding environment variables
- [ ] `/api/health/config` returns "healthy" status
- [ ] Can access sign-in page without errors
- [ ] Protected routes redirect to sign-in (instead of ERR_FAILED)

---

## Getting Help

If you're still experiencing issues:

1. Check `/api/health/config` output
2. Check Vercel Function Logs
3. Share the specific error message
4. Include the route that's failing
5. Mention whether it works locally

---

## Local Development

To test locally with the same environment:

1. Copy `.env.example` to `.env.local`
2. Fill in all required variables
3. Run `npm run dev`
4. Test at `http://localhost:3000`

If it works locally but not on Vercel, the issue is likely with environment variable configuration on Vercel.
