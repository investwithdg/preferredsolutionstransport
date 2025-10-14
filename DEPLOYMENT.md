# Deployment Guide - Vercel

This guide will help you deploy the Preferred Solutions Transport platform to Vercel.

## 🚀 Quick Deploy

### 1. Prerequisites
- GitHub account
- Vercel account (free tier works)
- All third-party services configured:
  - Supabase project
  - Stripe account
  - HubSpot private app
  - Google Maps API key

### 2. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)

### 4. Environment Variables

Add all environment variables from `env.example` in the Vercel dashboard:

#### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (update after webhook setup)

# HubSpot
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
GOOGLE_MAPS_API_KEY=AIzaSy...
```

#### Optional HubSpot Pipeline Configuration
```bash
# Get these from your HubSpot account
HUBSPOT_PIPELINE_ID=your_pipeline_id
HUBSPOT_STAGE_READY=your_stage_id
HUBSPOT_STAGE_ASSIGNED=your_stage_id
HUBSPOT_STAGE_PICKED_UP=your_stage_id
HUBSPOT_STAGE_DELIVERED=closedwon
HUBSPOT_STAGE_CANCELED=closedlost
```

#### Optional Variables
```bash
# Sentry (error tracking)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Feature Flags
FEATURE_WEBHOOK_DEDUPE=true
FEATURE_RATE_LIMITING=true

# Demo Mode (for local demos only; keep false in production)
NEXT_PUBLIC_DEMO_MODE=false
```

### 5. Database Schema (Canonical)

The canonical schema is `supabase/consolidated-schema.sql`.

1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase/consolidated-schema.sql`
3. Execute and verify the completion notices
4. Avoid applying legacy migrations that duplicate objects

### 6. Configure Stripe Webhook

After deployment, you need to update your Stripe webhook:

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
7. Redeploy your app

### 7. Update Supabase URL Allowlist

In your Supabase project:
1. Go to Authentication > URL Configuration
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/auth/callback`

### 8. Test Your Deployment

1. Visit your Vercel URL
2. Test the quote flow:
   - Submit a quote request
   - Complete Stripe checkout (use test card: 4242 4242 4242 4242)
   - Verify order appears in dispatcher dashboard
3. Check HubSpot for new contact and deal

## 🔧 Post-Deployment Configuration

### Domain Setup (Optional)
1. Go to Vercel Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase redirect URLs with custom domain

### HubSpot Pipeline Mapping

To map your actual HubSpot pipeline stages:

1. Log into HubSpot
2. Go to Settings > Objects > Deals > Pipelines
3. Click on your pipeline
4. Copy the Pipeline ID and Stage IDs
5. Update environment variables in Vercel:
   ```bash
   HUBSPOT_PIPELINE_ID=12345678
   HUBSPOT_STAGE_READY=appointmentscheduled
   HUBSPOT_STAGE_ASSIGNED=qualifiedtobuy
   HUBSPOT_STAGE_PICKED_UP=presentationscheduled
   HUBSPOT_STAGE_DELIVERED=closedwon
   HUBSPOT_STAGE_CANCELED=closedlost
   ```
6. Redeploy

### Google Maps API Restrictions

For production security:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Click on your API key
4. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add: `https://your-app.vercel.app/*`
5. Save changes

## 🐛 Troubleshooting

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript types are correct

### Webhook Not Working
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check Vercel function logs
- Ensure webhook URL is publicly accessible

### Database Connection Issues
- Verify Supabase environment variables
- Check RLS policies allow service role access
- Review Supabase logs

### HubSpot Integration Not Working
- Verify `HUBSPOT_PRIVATE_APP_TOKEN` has correct scopes:
  - Contacts: Read, Write
  - Deals: Read, Write
- Check Vercel function logs for HubSpot errors

## 📊 Monitoring

### Vercel Analytics
- Enabled by default
- View in Vercel dashboard

### Sentry (Optional)
If you added Sentry:
1. Check errors at sentry.io
2. Review webhook failures
3. Monitor API performance

## 🔐 Security Checklist

- [ ] All environment variables are set correctly
- [ ] Stripe is in live mode (not test mode)
- [ ] Webhook endpoints are secured with signature verification
- [ ] Google Maps API key has proper restrictions
- [ ] Supabase RLS policies are enabled
- [ ] No sensitive data in client-side code
- [ ] HTTPS is enforced (Vercel does this automatically)

## 🎉 You're Live!

Your delivery platform is now deployed and ready to accept orders. Share your Vercel URL with customers to start taking delivery requests!

---

**Need Help?** Check the [main README](./README.md) for more information or review the [API documentation](./app/api/README.md).
