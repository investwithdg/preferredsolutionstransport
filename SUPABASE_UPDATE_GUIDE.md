# Supabase Schema Update Guide (Milestone 2.5)

This guide walks you through updating your Supabase database schema to include the latest features from Milestone 2.5.

## 🎯 What's Being Added

The updated `supabase/consolidated-schema.sql` now includes:

### New Tables
- ✅ `public.users` - Role-based access control (admin, dispatcher, driver, recipient)
- ✅ `public.api_rate_limits` - Database-backed API rate limiting

### New Functions
- ✅ `current_user_role()` - Get the current authenticated user's role
- ✅ `is_admin_or_dispatcher()` - Check if user has admin/dispatcher privileges
- ✅ `check_rate_limit()` - Rate limiting logic for API endpoints
- ✅ `cleanup_rate_limits()` - Maintenance function to remove old rate limit records
- ✅ `get_system_health()` - Monitoring function for system metrics
- ✅ `get_system_alerts()` - Monitoring function for potential issues

### Enhanced Security
- ✅ Role-based RLS policies for all tables
- ✅ Admin/dispatcher full access to operational tables
- ✅ Driver access restricted to assigned orders only
- ✅ Recipient access to their own orders and events
- ✅ Data quality constraints (positive prices, valid distances)

### Performance Improvements
- ✅ Additional indexes for common query patterns
- ✅ Partial indexes for active orders and quotes
- ✅ Stripe session lookup indexes

---

## 📋 Step-by-Step Update Process

### Option 1: Fresh Setup (Recommended for New Projects)

If you haven't deployed to production yet or can afford to reset your database:

1. **Go to Supabase Dashboard**
   - Open your project at [supabase.com](https://supabase.com)
   - Navigate to **SQL Editor**

2. **Open the consolidated schema**
   - In your project, open `supabase/consolidated-schema.sql`
   - Copy the **entire file** contents (now 692 lines)

3. **Paste and run**
   - Paste into Supabase SQL Editor
   - Click **Run** (bottom right)
   - Wait for completion (~10-15 seconds)

4. **Verify success**
   - You should see multiple `NOTICE` messages ending with:
     ```
     MILESTONE 2.5 SCHEMA UPDATE COMPLETE!
     ```

### Option 2: Incremental Update (For Production with Data)

If you already have live data and don't want to reset:

1. **Backup your database first!**
   - Supabase Dashboard → Database → Backups
   - Create a manual backup

2. **Run only the new sections**
   - Open `supabase/consolidated-schema.sql`
   - Copy **only lines 387-692** (the Milestone 2.5 additions)
   - Paste and run in SQL Editor

3. **Handle conflicts gracefully**
   - The schema uses `IF NOT EXISTS` and `DROP POLICY IF EXISTS`
   - Safe to re-run if needed

---

## ✅ Verification Steps

### 1. Check Tables Were Created

Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'api_rate_limits', 'drivers', 'orders', 'customers', 'quotes', 'dispatch_events', 'webhook_events')
ORDER BY table_name;
```

**Expected:** 8 tables listed

### 2. Check Functions Were Created

Run this query:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('current_user_role', 'is_admin_or_dispatcher', 'check_rate_limit', 'get_system_health', 'get_system_alerts')
ORDER BY routine_name;
```

**Expected:** 5 functions listed

### 3. Test Rate Limiting Function

Run this query:
```sql
SELECT public.check_rate_limit('test_user', 'test_endpoint', 10, 60);
```

**Expected:** Returns `true` (first request allowed)

### 4. Test Monitoring Function

Run this query:
```sql
SELECT public.get_system_health();
```

**Expected:** JSON object with database stats

---

## 🔐 Setting Up User Roles

After the schema update, you need to create user accounts with roles.

### Create Admin User (For Yourself)

1. **Create an auth user first** (if not already done):
   - Supabase Dashboard → Authentication → Users
   - Click **Add User**
   - Enter email and password
   - Note the user's UUID

2. **Link to public.users table**:
   ```sql
   INSERT INTO public.users (auth_id, email, role)
   VALUES (
     'YOUR_AUTH_USER_UUID_HERE',
     'your-email@example.com',
     'admin'
   );
   ```

### Create Dispatcher Users

```sql
INSERT INTO public.users (auth_id, email, role)
VALUES (
  'DISPATCHER_AUTH_UUID',
  'dispatcher@example.com',
  'dispatcher'
);
```

### Link Existing Drivers to Auth

If you have drivers in the `public.drivers` table but no auth:

```sql
-- First create auth user, then:
UPDATE public.drivers
SET user_id = 'DRIVER_AUTH_UUID'
WHERE id = 'DRIVER_ID';
```

---

## 🧪 Testing the Schema

### Test 1: Anonymous Quote Creation (Should Work)

```sql
-- Simulate anonymous customer creating a quote
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role": "anon"}';

INSERT INTO public.customers (email, name, phone)
VALUES ('test@example.com', 'Test User', '555-0100')
RETURNING id;

-- Use the returned customer_id in next query
INSERT INTO public.quotes (customer_id, pickup_address, dropoff_address, distance_mi, pricing)
VALUES (
  'CUSTOMER_ID_FROM_ABOVE',
  '123 Main St',
  '456 Oak Ave',
  5.2,
  '{"baseFee": 25, "perMileRate": 2.5, "fuelPct": 0.15, "subtotal": 38, "total": 43.70}'::jsonb
);

RESET ROLE;
```

**Expected:** Both inserts succeed

### Test 2: Driver Access (Should Be Restricted)

```sql
-- Create a driver auth user first, then test:
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO json_build_object(
  'role', 'authenticated',
  'sub', 'DRIVER_AUTH_UUID'
)::text;

-- Driver should only see their assigned orders
SELECT * FROM public.orders WHERE driver_id IS NOT NULL;

RESET ROLE;
```

**Expected:** Only sees orders assigned to them

### Test 3: Admin Access (Should See Everything)

```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO json_build_object(
  'role', 'authenticated',
  'sub', 'ADMIN_AUTH_UUID'
)::text;

-- Admin should see all orders
SELECT count(*) FROM public.orders;

RESET ROLE;
```

**Expected:** Sees all orders

---

## 🐛 Common Issues

### Issue: "relation 'public.users' already exists"
**Solution:** The table was created before. This is fine, the schema will skip it.

### Issue: "duplicate key value violates unique constraint"
**Solution:** 
- A user with that email or auth_id already exists
- Query to check: `SELECT * FROM public.users WHERE email = 'your-email@example.com';`

### Issue: RLS policies blocking operations
**Solution:**
- Make sure you're using service role key in your app (already configured in `lib/supabase/server.ts`)
- Service role bypasses RLS for API operations

### Issue: Functions not found when app calls them
**Solution:**
- Run `NOTIFY pgrst, 'reload schema';` in SQL Editor
- Or restart your Supabase project (Settings → General → Pause → Resume)

---

## 📊 Schema Compatibility

### Backward Compatible?
✅ **Yes** - All changes use `IF NOT EXISTS` and `DROP IF EXISTS`
- Existing tables/data are preserved
- New columns are nullable or have defaults
- Policies are replaced, not broken

### Safe to Re-Run?
✅ **Yes** - The entire consolidated schema is idempotent
- Won't duplicate data
- Won't break existing functionality
- Will only add missing pieces

---

## 🚀 After Schema Update

1. ✅ Schema is updated in Supabase
2. ⏭️ Add environment variables to Vercel (see `VERCEL_ENV_CHECKLIST.md`)
3. ⏭️ Redeploy your Vercel app
4. ⏭️ Test the deployment (`/api/health`, `/quote`, etc.)
5. ⏭️ Create admin/dispatcher user accounts as needed
6. ⏭️ Link existing drivers to auth users (if applicable)

---

## 📞 Need Help?

- Check `/api/health` endpoint - shows database connectivity
- Review Supabase logs: Dashboard → Logs → Postgres Logs
- Check for errors in Vercel function logs
- Test individual functions in SQL Editor first

---

## 🎉 Success Indicators

After applying the schema, you should be able to:

- ✅ Create quotes as anonymous users
- ✅ Process payments and create orders
- ✅ Assign drivers to orders in dispatcher view
- ✅ Update order status in driver view
- ✅ Track events in dispatch_events table
- ✅ Use rate limiting on API endpoints
- ✅ Monitor system health via `/api/health`
- ✅ Access protected routes based on user roles

---

**Last Updated:** October 2, 2025  
**Schema Version:** Milestone 2.5 (consolidated)  
**File:** `supabase/consolidated-schema.sql` (692 lines)


