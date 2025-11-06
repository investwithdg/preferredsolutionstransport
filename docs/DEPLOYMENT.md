# Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the application to Vercel, configuring the environment, and troubleshooting common deployment issues.

## 1. Vercel Project Setup

1.  **Import to Vercel**: Connect your GitHub repository to Vercel. Vercel will auto-detect the Next.js framework.
2.  **Add Environment Variables**: Copy ALL variables from `.env.local` to the Vercel project dashboard under **Settings → Environment Variables**.
    -   **Critical**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, all Supabase keys, and all Stripe keys.
    -   Ensure you enable the variables for **Production, Preview, and Development** environments.
3.  **Deploy**: Vercel will automatically build and deploy the application when you push to the main branch.

## 2. Supabase Configuration for Vercel

To support authentication across local, preview, and production environments, you need to configure Supabase correctly.

1.  Open **Supabase → Authentication → URL Configuration**.
2.  Set **Site URL** to your production domain (e.g., `https://your-app.com`).
3.  Add the following **Redirect URLs**:
    ```
    http://localhost:3000/auth/callback
    https://*.vercel.app/auth/callback
    https://your-production-domain.com/auth/callback
    ```
    The wildcard `*.vercel.app` allows any Vercel preview deployment to work without manual configuration.

## 3. Post-Deployment

1.  **Update Stripe Webhook**: Point your Stripe webhook to `https://your-production-domain.com/api/stripe/webhook` and update the `STRIPE_WEBHOOK_SECRET` in Vercel.
2.  **Test Health Check**: Visit `/api/health/config` on your deployment to verify that all environment variables are correctly set.

## 4. Troubleshooting

### Common Issue: `ERR_FAILED` on Protected Routes

This is typically caused by **missing environment variables** on Vercel.

#### Step 1: Check What's Missing
Visit the configuration health check endpoint on your Vercel app:
`https://your-app.vercel.app/api/health/config`

This will show you which environment variables are missing or misconfigured.

#### Step 2: Add Missing Environment Variables
Go to your Vercel project's **Settings → Environment Variables** and add any missing variables. Ensure they are enabled for all environments.

#### Step 3: Redeploy
After adding the variables, redeploy your application by pushing a new commit or using the "Redeploy" button in the Vercel dashboard.

#### Step 4: Verify the Fix
After redeploying, check the health endpoint again. It should return `"status": "healthy"`. Protected routes like `/driver` should now redirect to the sign-in page instead of showing an error.

### Other Common Issues

| Error | Cause | Solution |
| :--- | :--- | :--- |
| App appears blank | Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Add the Google Maps API key to Vercel. |
| Build failures | TypeScript errors or missing env vars | Run `npm run build` locally to test. Check Vercel build logs. |
| Auth redirect failures | Supabase redirect URLs misconfigured | Add `https://*.vercel.app/auth/callback` to Supabase redirect URLs. |
| Stripe webhook failures | Incorrect URL or secret | Verify the webhook URL and secret in your Stripe and Vercel dashboards. |

For a full checklist for testing authentication, see **[Authentication Testing Checklist](TESTING.md#authentication-testing-checklist)**.
