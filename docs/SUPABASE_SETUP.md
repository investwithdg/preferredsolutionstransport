# Supabase Setup Instructions

This guide walks you through setting up your fresh Supabase project step-by-step.

## ✅ Completed

- [x] Migration files created (`supabase/migrations/`)
- [x] Seed file created (`supabase/seeds/`)
- [x] Environment variables template added to `.env.local`

## 📋 Next Steps (Follow in Order)

### Step 1: Update Environment Variables

1. Open your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Project Settings** → **API**
3. Copy the following values:
   - **Project URL** → Copy to `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - **anon/public key** → Copy to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - **service_role key** (click "Reveal") → Copy to `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

4. Save `.env.local`

**⚠️ Important**: Never commit the service role key to git!

### Step 2: Configure Supabase Authentication

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**

2. Add these **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://*.vercel.app/auth/callback
   ```
   
   If you have a production domain, add:
   ```
   https://your-production-domain.com/auth/callback
   ```

3. Go to **Authentication** → **Providers** → **Email**
   - Enable **Email provider**
   - Disable "Confirm email" for development (optional, makes testing easier)
   - Click **Save**

4. (Optional) Enable OAuth providers:
   - **Google**: Follow Supabase docs to set up OAuth client ID
   - **Facebook**: Follow Supabase docs to set up Facebook app

### Step 3: Initialize Supabase Locally (Recommended)

If you want to test locally before pushing to remote:

```bash
cd /Users/drg/Projects/preferredsolutionstransport

# Initialize Supabase (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Your project ref is in the URL: 
# https://app.supabase.com/project/YOUR_PROJECT_REF
```

### Step 4: Apply Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
cd /Users/drg/Projects/preferredsolutionstransport

# Push migrations to your remote Supabase project
supabase db push
```

**Option B: Manual via Dashboard**

1. Open Supabase Dashboard → **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_core_schema.sql`
4. Paste and click **Run**
5. Wait for success ✅
6. Create another new query
7. Copy the entire contents of `supabase/migrations/002_proof_of_delivery.sql`
8. Paste and click **Run**
9. Wait for success ✅

### Step 5: Run Seed Script

**Option A: Using Supabase CLI**

```bash
cd /Users/drg/Projects/preferredsolutionstransport

# Seed the database with test users
supabase db seed
```

**Option B: Manual via Dashboard**

1. Open Supabase Dashboard → **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/seeds/001_test_users.sql`
4. Paste and click **Run**
5. Wait for success ✅

**Verify seed worked:**

Go to **Authentication** → **Users** in the dashboard. You should see 4 users:
- admin@preferredsolutions.test
- dispatcher@preferredsolutions.test
- driver@preferredsolutions.test
- customer@preferredsolutions.test

### Step 6: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Settings:
   - **Name**: `proof-of-delivery` (exactly this, no typos!)
   - **Public**: ❌ **UNCHECK** (keep it private!)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: Leave default or add: `image/jpeg, image/png`
4. Click **Create bucket**

**Verify**: You should see `proof-of-delivery` bucket in the list.

Note: The storage policies were already created by the migration.

### Step 7: Verify Database Schema

1. Go to **Database** → **Tables** in Supabase Dashboard
2. You should see these tables:
   - ✅ users
   - ✅ customers
   - ✅ drivers
   - ✅ orders
   - ✅ quotes
   - ✅ dispatch_events
   - ✅ webhook_events
   - ✅ delivery_proof

3. Go to **Database** → **Roles** → Click on `postgres` role
4. Verify RLS is enabled (green checkmark) on all tables

### Step 8: Update TypeScript Types

After migrations are applied, regenerate your TypeScript types:

```bash
cd /Users/drg/Projects/preferredsolutionstransport

# Generate types from your remote database
supabase gen types typescript --linked > lib/supabase/types.ts

# Or from local if you're using local development
supabase gen types typescript --local > lib/supabase/types.ts
```

This will update `lib/supabase/types.ts` to match your new schema.

### Step 9: Test Authentication Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/sign-in`

3. Test each role:

   **Admin**:
   - Email: `admin@preferredsolutions.test`
   - Password: `Admin123!`
   - Should redirect to: `/admin`

   **Dispatcher**:
   - Email: `dispatcher@preferredsolutions.test`
   - Password: `Dispatcher123!`
   - Should redirect to: `/dispatcher`

   **Driver**:
   - Email: `driver@preferredsolutions.test`
   - Password: `Driver123!`
   - Should redirect to: `/driver`

   **Customer**:
   - Email: `customer@preferredsolutions.test`
   - Password: `Customer123!`
   - Should redirect to: `/customer/dashboard`

4. **Verify**:
   - ✅ No authentication errors
   - ✅ No redirect loops
   - ✅ Correct dashboard loads for each role
   - ✅ Session persists on page refresh

### Step 10: Test RLS Policies

1. Sign in as **Driver** (`driver@preferredsolutions.test`)
2. Go to `/driver`
3. Verify: Driver can only see their own orders (none yet, but no errors)
4. Sign out

5. Sign in as **Dispatcher** (`dispatcher@preferredsolutions.test`)
6. Go to `/dispatcher`
7. Verify: Dispatcher can see all orders
8. Sign out

9. Sign in as **Customer** (`customer@preferredsolutions.test`)
10. Go to `/customer/dashboard`
11. Verify: Customer can only see their own orders

### Step 11: Deploy to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update these variables:
   - `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → Your Supabase service role key
4. Click **Save**
5. Redeploy your application

## 🎉 Success Criteria

You're all set when:

- [x] All 4 test users can sign in with email/password
- [x] Each role lands on the correct dashboard
- [x] No authentication errors or redirect loops
- [x] RLS policies enforce role-based data access
- [x] Middleware correctly restricts routes by role
- [x] `proof-of-delivery` storage bucket exists and is private
- [x] TypeScript types match the database schema

## 📚 Test User Reference

| Role       | Email                               | Password        | Dashboard             |
|------------|-------------------------------------|-----------------|-----------------------|
| Admin      | admin@preferredsolutions.test       | Admin123!       | /admin                |
| Dispatcher | dispatcher@preferredsolutions.test  | Dispatcher123!  | /dispatcher           |
| Driver     | driver@preferredsolutions.test      | Driver123!      | /driver               |
| Customer   | customer@preferredsolutions.test    | Customer123!    | /customer/dashboard   |

## 🔧 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` has all three Supabase variables
- Restart dev server after updating `.env.local`

### "Invalid API key"
- Verify you copied the correct keys from Supabase dashboard
- Make sure there are no extra spaces or quotes

### "Authentication failed" on sign in
- Check that the seed script ran successfully
- Verify users exist in **Authentication** → **Users** in Supabase Dashboard
- Try resetting password via Supabase Dashboard

### "Redirect loop" after sign in
- Check middleware.ts is correctly reading the user's role
- Verify the user has a role in the `public.users` table
- Check browser console for errors

### "Row Level Security policy violation"
- Verify RLS is enabled on all tables
- Check that policies were created by the migrations
- Sign in with the correct role for the data you're trying to access

### Storage bucket errors
- Verify bucket name is exactly `proof-of-delivery`
- Check that bucket is set to **Private** (not public)
- Verify storage policies exist (they're created by migration)

## 🆘 Need Help?

Check:
1. Browser console for JavaScript errors
2. Network tab for failed API requests
3. Supabase Dashboard → Logs for database errors
4. Verify all environment variables are set correctly

## 📝 Next Steps After Setup

Once setup is complete, you can:
- Create real orders via the quote form
- Test the driver workflow
- Test proof of delivery capture
- Set up HubSpot integration
- Add more test data as needed

