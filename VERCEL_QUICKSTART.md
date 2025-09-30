# Vercel Quick Start Guide

## 🤔 What is Vercel?

Vercel is a **deployment platform** that automatically builds and hosts your Next.js application. Think of it as a robot that:
1. Watches your GitHub repository
2. Automatically builds your app every time you push code
3. Hosts it on the internet with a live URL
4. Handles all the server infrastructure for you

## 🔄 What's Happening Right Now?

Based on your screenshot, here's what's happening:

1. **You push code to GitHub** → Vercel detects the change
2. **Vercel starts building** → Runs `npm run build` automatically
3. **Build failed** → ESLint found an error (apostrophe issue - NOW FIXED! ✅)
4. **Deployment stopped** → Won't go live until the build succeeds

## ✅ What I Just Fixed

The error was in `app/customer/dashboard/page.tsx`:
- **Before**: `You haven't placed...` (unescaped apostrophe ❌)
- **After**: `You haven&apos;t placed...` (properly escaped ✅)

## 🚀 Next Steps to Deploy

### Step 1: Commit and Push the Fix
```bash
git add .
git commit -m "Fix ESLint apostrophe error"
git push origin main
```

This will trigger another Vercel build automatically.

### Step 2: Add Your Environment Variables in Vercel

**IMPORTANT**: Vercel doesn't have access to your `.env.local` file. You need to add environment variables manually in the Vercel dashboard.

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add each variable from your `.env.local`:

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_... (or sk_live_ for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_)
STRIPE_WEBHOOK_SECRET=whsec_... (you'll update this after deployment)
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Your HubSpot Pipeline IDs (you mentioned you found these):**
```
HUBSPOT_PIPELINE_ID=your_actual_pipeline_id
HUBSPOT_STAGE_READY=your_ready_stage_id
HUBSPOT_STAGE_ASSIGNED=your_assigned_stage_id
HUBSPOT_STAGE_PICKED_UP=your_pickedup_stage_id
HUBSPOT_STAGE_DELIVERED=closedwon
HUBSPOT_STAGE_CANCELED=closedlost
```

4. Click **Save** for each variable

### Step 3: Redeploy After Adding Variables

After adding environment variables:
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

OR just make any code change and push to GitHub (Vercel will rebuild automatically).

### Step 4: Update Stripe Webhook URL

After your app is live, you'll have a Vercel URL like: `https://your-app.vercel.app`

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter: `https://your-app.vercel.app/api/stripe/webhook`
4. Select event: `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Go back to Vercel → Settings → Environment Variables
7. Update `STRIPE_WEBHOOK_SECRET` with the new value
8. Redeploy one more time

## 🎯 Understanding the Vercel Workflow

### Every Time You Push to GitHub:

```
Your Code (GitHub)
       ↓
Vercel detects push
       ↓
Runs: npm install
       ↓
Runs: npm run build  ← THIS IS WHERE IT FAILED
       ↓
Runs linting & type checking
       ↓
If successful: Deploy to live URL ✅
If failed: Stop and show error ❌
```

### Common Build Errors:

1. **ESLint errors** (like the apostrophe) → Fix code syntax
2. **TypeScript errors** → Fix type issues
3. **Missing dependencies** → Add to package.json
4. **Missing environment variables** → Add in Vercel dashboard

## 📊 How to Monitor Builds

In your Vercel dashboard:

1. **Deployments Tab**: See all builds (successful and failed)
2. **Build Logs**: Click any deployment to see detailed logs
3. **Runtime Logs**: See errors from running application
4. **Preview Deployments**: Every branch gets its own preview URL

## 🔍 Reading Build Logs (What You Saw)

Your screenshot showed:
- ❌ Red text = Errors that stop the build
- ⚠️ Yellow text = Warnings (won't stop build, but good to fix)
- ℹ️ White text = Normal build output

The specific error:
```
28:22 Error: '' can be escaped with `&apos;`
```
This means line 28, character 22 had an unescaped apostrophe.

## ✅ Success Indicators

When your build succeeds, you'll see:
- ✓ Build completed
- ✓ Deployment ready
- A live URL you can visit
- Green status in Deployments tab

## 💡 Pro Tips

### 1. Test Locally First
Before pushing to GitHub:
```bash
npm run build
```
This runs the same build process Vercel uses. If it succeeds locally, it should succeed on Vercel.

### 2. Use Preview Deployments
Every pull request gets its own preview URL. Great for testing before merging to main.

### 3. Environment Variables Per Environment
Vercel lets you set different variables for:
- **Production** (main branch)
- **Preview** (all other branches)
- **Development** (local development)

### 4. Check Function Logs
API routes run as serverless functions. View logs in Vercel dashboard under Runtime Logs.

## 🐛 Troubleshooting

### Build Fails Locally and on Vercel
→ Fix the code errors (ESLint, TypeScript, etc.)

### Build Succeeds Locally but Fails on Vercel
→ Usually missing environment variables or different Node version

### Build Succeeds but App Doesn't Work
→ Check Runtime Logs for API errors
→ Verify all environment variables are set correctly

### Webhook Not Working
→ Make sure you updated STRIPE_WEBHOOK_SECRET with the **Vercel URL** webhook secret
→ Check that webhook URL is correct in Stripe dashboard

## 🎉 What to Expect After Fix

Once you push the fixed code:

1. Vercel will detect your push (usually within seconds)
2. Start a new build
3. If environment variables are set → Build should succeed ✅
4. You'll get a live URL
5. Your app will be accessible on the internet!

## 📞 Next Steps Checklist

- [ ] Push the apostrophe fix to GitHub
- [ ] Wait for Vercel to rebuild (watch the Deployments tab)
- [ ] If build fails, check the logs and fix errors
- [ ] Once build succeeds, add all environment variables in Vercel
- [ ] Redeploy after adding variables
- [ ] Visit your live URL and test the quote flow
- [ ] Update Stripe webhook with your Vercel URL
- [ ] Update STRIPE_WEBHOOK_SECRET in Vercel
- [ ] Final redeploy and test end-to-end

---

**You're almost there!** The hard part (building the app) is done. Now it's just configuration. 🚀
