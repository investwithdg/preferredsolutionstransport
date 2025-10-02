# Vercel Environment Variables Checklist

This document helps you set up all required environment variables in Vercel for successful deployment.

## 🚨 Critical Variables (App won't work without these)

### Supabase (Database & Auth)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Where to find:** Supabase Project Settings → API

### Stripe (Payments)
```bash
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```
**Where to find:** 
- Secret & Publishable keys: Stripe Dashboard → Developers → API keys
- Webhook secret: Stripe Dashboard → Developers → Webhooks (create endpoint pointing to your-domain.com/api/stripe/webhook)

### Google Maps (Quote Form - CRITICAL!)
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA...
GOOGLE_MAPS_API_KEY=AIzaSyA...
```
**Why critical:** Without this, the quote page will be stuck on "Loading Google Maps..." and appear blank.
**Where to find:** Google Cloud Console → APIs & Services → Credentials

### HubSpot (CRM Integration)
```bash
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...
```
**Where to find:** HubSpot → Settings → Integrations → Private Apps

---

## ✅ Recommended Variables (Improves functionality)

### Site URLs
```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```
**Purpose:** Sets canonical URLs for redirects (Stripe checkout success/cancel, auth callbacks)
**Note:** If not set, app falls back to `VERCEL_URL` which works but is less predictable

---

## 🎛️ Optional Variables (Enhances features)

### HubSpot Pipeline Configuration
```bash
HUBSPOT_PIPELINE_ID=default
HUBSPOT_STAGE_READY=appointmentscheduled
HUBSPOT_STAGE_ASSIGNED=qualifiedtobuy
HUBSPOT_STAGE_PICKED_UP=presentationscheduled
HUBSPOT_STAGE_DELIVERED=closedwon
HUBSPOT_STAGE_CANCELED=closedlost
```
**Purpose:** Maps order statuses to your HubSpot deal stages
**Note:** App uses sensible defaults if not provided

### Sentry Error Tracking
```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```
**Purpose:** Captures errors and performance metrics in production
**Note:** Completely optional. App works fine without it; no data is sent if not configured

### Feature Flags
```bash
FEATURE_RATE_LIMITING=true
FEATURE_WEBHOOK_DEDUPE=true
```
**Purpose:** 
- `FEATURE_RATE_LIMITING`: Enables database-backed API rate limiting
- `FEATURE_WEBHOOK_DEDUPE`: Enables webhook deduplication (already default behavior)

---

## 🔒 Variables NOT to Set Manually

### Vercel System Variables (Auto-injected)
```bash
VERCEL_URL=auto-set-by-vercel.vercel.app
NODE_ENV=production
```
**Important:** Vercel automatically sets these at runtime. Don't add them manually.

---

## 📋 Quick Setup Steps in Vercel

1. **Go to your Vercel project**
2. **Click Settings → Environment Variables**
3. **Add each variable:**
   - Name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Value: `AIzaSy...` (your actual key)
   - Environment: Select **Production**, **Preview**, and **Development**
4. **Repeat for all required variables**
5. **Trigger new deployment** (Vercel → Deployments → ⋮ menu → Redeploy)

---

## 🧪 Testing After Deployment

### 1. Health Check
Visit: `https://your-domain.com/api/health`

Should return:
```json
{
  "status": "ok",
  "checks": {
    "database": true,
    "environment": true,
    "stripe": true,
    "hubspot": true
  }
}
```

### 2. Home Page
Visit: `https://your-domain.com/`

Should show: Landing page with "Get a Quote" button

### 3. Quote Form (Most Common Issue)
Visit: `https://your-domain.com/quote`

**Expected:** Form with Google Maps autocomplete
**If stuck on "Loading Google Maps...":** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing or invalid

### 4. Check Browser Console
Open DevTools (F12) → Console tab
Look for errors mentioning missing env variables

---

## 🐛 Troubleshooting

### Issue: Blank page / "Loading Google Maps..."
**Fix:** Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel, redeploy

### Issue: Quote form submits but no order created
**Fix:** Check Supabase credentials and `STRIPE_SECRET_KEY`

### Issue: Payment succeeds but order not in dispatcher queue
**Fix:** Update `STRIPE_WEBHOOK_SECRET` after deployment
1. Get your Vercel URL
2. Create Stripe webhook pointing to `https://your-domain.com/api/stripe/webhook`
3. Copy webhook secret from Stripe
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel
5. Redeploy

### Issue: /api/health shows checks failing
**Fix:** 
- `database: false` → Check Supabase credentials
- `stripe: false` → Check `STRIPE_SECRET_KEY` format (must start with `sk_`)
- `hubspot: false` → Check `HUBSPOT_PRIVATE_APP_TOKEN`

---

## 📝 Current .env.local Values

**Reference only** (Vercel doesn't see your local files):

Based on your `.env.local`:
- ✅ You have HubSpot token: `pat-na1-c8298924-2393-4a03-beb5-368863733fa3`
- ⚠️ Make sure to copy ALL values from your local `.env.local` to Vercel

---

## 🎯 Minimum Required for Basic Deployment

If you want the absolute minimum to get the site live (for testing):

```bash
# These 6 variables are non-negotiable:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_... (use test key initially)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

You can add the rest later, but without these 6, the app won't function.


