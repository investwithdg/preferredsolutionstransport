# Database Schema Cleanup Summary

**Date:** October 2, 2025  
**Status:** ✅ Complete - Schema Consolidated & Role-Based Access Clarified

---

## What Was Done

### 🗑️ Removed Redundant Migration Files

Deleted **3 conflicting migration files** that were duplicating the same schema:

1. ❌ `supabase/migrations/20250826170806_milestone_2_drivers.sql`
2. ❌ `supabase/migrations/20250922_production_hardening.sql`
3. ❌ `supabase/migrations/20250922_auth_rls.sql`

**Why?** These migrations were:
- Creating the same RLS policies multiple times
- Dropping and recreating policies, causing conflicts
- Duplicating functionality already in `consolidated-schema.sql`

### ✅ What Remains

**Single Migration:**
- ✅ `supabase/migrations/20250819_hardening.sql` (base hardening - already applied)

**Complete Schema File:**
- ✅ `supabase/consolidated-schema.sql` (comprehensive, non-redundant)

---

## Schema Architecture

### File Structure

```
supabase/
├── migrations/
│   └── 20250819_hardening.sql          # Base hardening (historical)
├── schema.sql                          # Legacy Milestone 1 schema
└── consolidated-schema.sql             # ⭐ USE THIS - Complete schema
```

### What's in `consolidated-schema.sql`

This single file contains **EVERYTHING** you need:

1. **Core Tables**
   - `customers` - Customer information
   - `quotes` - Quote requests and pricing
   - `orders` - Confirmed orders after payment
   - `drivers` - Driver profiles
   - `dispatch_events` - Audit trail (append-only)
   - `webhook_events` - Stripe webhook tracking
   - `users` - Role-based access control
   - `api_rate_limits` - Rate limiting infrastructure

2. **Enums & Types**
   - `order_status` - Order state machine
   - `user_role` - User role types (admin, dispatcher, driver, recipient)

3. **Functions**
   - `update_updated_at_column()` - Auto-update timestamps
   - `no_update_delete_dispatch_events()` - Enforce append-only
   - `validate_order_transition()` - Enforce legal status transitions
   - `expire_quotes()` - Mark expired quotes
   - `current_user_role()` - Get authenticated user's role
   - `is_admin_or_dispatcher()` - Check privileged access
   - `check_rate_limit()` - API rate limiting
   - `cleanup_rate_limits()` - Clean old rate limit records
   - `get_system_health()` - System monitoring metrics
   - `get_system_alerts()` - Detect potential issues

4. **Triggers**
   - Auto-update `updated_at` on orders/drivers
   - Prevent updates/deletes on dispatch_events
   - Validate order status transitions

5. **Indexes** (Performance optimized)
   - Customer lookups by email
   - Order filtering by status/driver
   - Quote expiration checks
   - Dispatch event timeline
   - Rate limiting lookups

6. **Row-Level Security (RLS) Policies** - Now clearly organized by role!

---

## 🎯 Role-Based Access Control - Crystal Clear

### The 6 Roles

The schema now clearly defines **6 distinct user roles**:

```sql
-- USER ROLES IN THIS SYSTEM:
-- 1. ANONYMOUS     - Public users requesting quotes (not logged in)
-- 2. RECIPIENT     - Authenticated customers tracking their orders
-- 3. DRIVER        - Authenticated drivers viewing/updating assigned orders
-- 4. DISPATCHER    - Authenticated staff managing orders and assignments
-- 5. ADMIN         - Full system access for management
-- 6. SERVICE_ROLE  - Backend API operations (full access)
```

### Policy Organization

RLS policies are now organized by role for clarity:

```sql
-- SERVICE ROLE POLICIES (Backend API - Full Access)
-- └─ Full CRUD on all tables

-- ANONYMOUS USER POLICIES (Public Quote Requests)
-- └─ INSERT only for customers/quotes

-- ADMIN & DISPATCHER POLICIES (Full Operational Access)
-- ├─ Full CRUD on orders
-- ├─ Full CRUD on drivers
-- └─ Full CRUD on dispatch_events

-- DRIVER POLICIES (Own Profile + Assigned Orders)
-- ├─ View/update own profile
-- ├─ View all driver profiles (for reference)
-- ├─ View orders assigned to them
-- ├─ Update status of assigned orders
-- └─ View dispatch events for assigned orders

-- RECIPIENT POLICIES (Customers Tracking Their Orders)
-- ├─ View own customer record
-- ├─ View own orders
-- ├─ View own dispatch events
-- └─ View own quotes
```

### No More Redundancy! ✅

**Before:** Multiple policies dropping/recreating the same rules across 3 files  
**After:** Single, clear definition of each policy in one place

---

## 📚 New Documentation

Created comprehensive role documentation:

### `ROLE_PERMISSIONS.md`

This new file provides:
- ✅ Detailed breakdown of each role's permissions
- ✅ Permission matrix showing what each role can do with each table
- ✅ Use cases for each role
- ✅ UI access mapping (which role sees which dashboard)
- ✅ Security principles and constraints
- ✅ Troubleshooting common RLS issues

**Key sections:**
- Role overview table
- Detailed permissions for each role
- Permission matrix
- Role assignment logic
- Testing recommendations
- Troubleshooting guide

---

## 🚀 How to Deploy This Schema

### For Fresh Database (Recommended)

If you're starting fresh or can reset your Supabase database:

1. **Go to Supabase SQL Editor**
   - Navigate to your project dashboard
   - Open the SQL Editor

2. **Copy & Paste Entire File**
   ```bash
   # Copy the entire contents of:
   supabase/consolidated-schema.sql
   ```

3. **Execute**
   - Paste into SQL Editor
   - Click "Run"
   - Watch for success messages

4. **Verify**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';

   -- Check policies created
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public';
   ```

### For Existing Database (With Data)

If you already have data and migrations applied:

1. **Backup your data first!**
   ```sql
   -- Export via Supabase dashboard
   ```

2. **Review existing policies**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public';
   ```

3. **Apply consolidated schema**
   - The `DROP POLICY IF EXISTS` statements will clean up conflicts
   - Existing data will be preserved
   - New policies will be applied

---

## 🔍 What Changed in consolidated-schema.sql

### Enhanced Documentation

```sql
-- Added clear header explaining all 6 roles
-- USER ROLES IN THIS SYSTEM:
-- 1. ANONYMOUS - Public users requesting quotes...
-- 2. RECIPIENT - Authenticated customers...
-- etc.
```

### Reorganized Policies by Role

**Before:**
```sql
-- Policies were mixed together with service role, anonymous,
-- drivers, etc. all intermingled
```

**After:**
```sql
-- =============================================================================
-- SERVICE ROLE POLICIES (Backend API - Full Access)
-- =============================================================================
[Service role policies...]

-- =============================================================================
-- ANONYMOUS USER POLICIES (Public Quote Requests)
-- =============================================================================
[Anonymous policies...]

-- =============================================================================
-- ADMIN & DISPATCHER POLICIES (Full Operational Access)
-- =============================================================================
[Admin/dispatcher policies...]

-- =============================================================================
-- DRIVER POLICIES (Own Profile + Assigned Orders)
-- =============================================================================
[Driver policies...]

-- =============================================================================
-- RECIPIENT POLICIES (Customers Tracking Their Orders)
-- =============================================================================
[Recipient policies...]
```

### Removed Duplicates

Removed all duplicate policy definitions that were in the Milestone 2.5 section.

### Added Clarity Comments

Every policy now has a clear comment explaining:
- What it does
- Which role it applies to
- What operations it permits

---

## ✅ Verification Checklist

After deploying the schema, verify:

- [ ] All 8 tables exist (customers, quotes, orders, drivers, dispatch_events, webhook_events, users, api_rate_limits)
- [ ] All RLS policies are active (no duplicate policy names)
- [ ] Test each role's access:
  - [ ] Anonymous can insert quotes/customers
  - [ ] Drivers can only see assigned orders
  - [ ] Recipients can only see own orders
  - [ ] Dispatchers can see all orders
  - [ ] Service role has full access
- [ ] Triggers are working (append-only, status transitions)
- [ ] Indexes are created (check query performance)

---

## 📁 Files Modified

### Deleted:
- ❌ `supabase/migrations/20250826170806_milestone_2_drivers.sql`
- ❌ `supabase/migrations/20250922_production_hardening.sql`
- ❌ `supabase/migrations/20250922_auth_rls.sql`

### Modified:
- ✏️ `supabase/consolidated-schema.sql` - Reorganized RLS policies by role

### Created:
- ✨ `ROLE_PERMISSIONS.md` - Comprehensive role documentation
- ✨ `SCHEMA_CLEANUP_SUMMARY.md` - This file

### Unchanged:
- ✅ `supabase/migrations/20250819_hardening.sql` - Kept for historical reference
- ✅ `supabase/schema.sql` - Legacy schema (can be deleted if not used)

---

## 🎓 Key Takeaways

1. **Single Source of Truth**
   - Use `consolidated-schema.sql` for all deployments
   - No more conflicting migrations

2. **Role-Based Security is Clear**
   - 6 distinct roles with explicit permissions
   - Easy to understand what each role can do
   - Well-documented in both schema and ROLE_PERMISSIONS.md

3. **Non-Redundant**
   - Each policy defined once
   - No duplicate or conflicting rules
   - Clean, maintainable structure

4. **Production-Ready**
   - Rate limiting infrastructure
   - Monitoring functions
   - Audit trail (append-only events)
   - Status transition validation
   - Performance indexes

---

## 🚨 Important Notes

### Environment Variables Required

Make sure these are set in your environment:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # ⚠️ Server-side only!

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_maps_key
```

### Security Reminders

- ⚠️ **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to frontend
- ⚠️ Service role bypasses ALL RLS policies
- ✅ Always use anon key in client-side code
- ✅ RLS policies automatically apply for authenticated users

---

## 📞 Need Help?

### Troubleshooting

**"Policy already exists" error:**
- The schema includes `DROP POLICY IF EXISTS` - this shouldn't happen
- If it does, manually drop the policy in Supabase SQL Editor

**"RLS policy violation":**
- User doesn't have required role in `users` table
- Check role assignment logic
- See `ROLE_PERMISSIONS.md` troubleshooting section

**Driver can't update orders:**
- Verify `driver_id` matches their `user_id`
- Check status transition is legal
- See order state machine in schema

---

**Questions?** Review:
- `ROLE_PERMISSIONS.md` for access control details
- `supabase/consolidated-schema.sql` for implementation
- `VERCEL_ENV_CHECKLIST.md` for deployment setup

---

**Last Updated:** October 2, 2025

