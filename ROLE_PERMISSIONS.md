# Role-Based Access Control (RBAC) Documentation

This document defines the six user roles in the Preferred Solutions Transport system and their explicit permissions.

---

## User Roles Overview

| Role | Description | UI Access |
|------|-------------|-----------|
| **ANONYMOUS** | Public users (not logged in) | Quote request page only |
| **RECIPIENT** | Authenticated customers | Customer dashboard (order tracking) |
| **DRIVER** | Authenticated delivery drivers | Driver dashboard (assigned orders) |
| **DISPATCHER** | Staff managing operations | Dispatcher dashboard (all orders) |
| **ADMIN** | System administrators | Admin panel (full access) |
| **SERVICE_ROLE** | Backend API only | N/A (server-side only) |

---

## 1. ANONYMOUS (Public Users)

**Who:** Anyone visiting the website without authentication

### Permissions:
- ✅ **CREATE** quote requests
- ✅ **CREATE** customer records (when submitting quotes)
- ❌ **NO READ** access to existing data
- ❌ **NO UPDATE** capabilities
- ❌ **NO DELETE** capabilities

### Use Cases:
- Submit a quote request form on the public website
- Provide contact information for quote follow-up

---

## 2. RECIPIENT (Authenticated Customers)

**Who:** Customers who have created an account and placed orders

### Permissions:

#### Customers Table:
- ✅ **READ** their own customer record only
- ❌ Cannot modify or delete

#### Quotes Table:
- ✅ **READ** quotes they created
- ❌ Cannot modify or delete quotes

#### Orders Table:
- ✅ **READ** orders they placed
- ❌ Cannot modify or delete orders (status updates handled by system/drivers)

#### Dispatch Events Table:
- ✅ **READ** dispatch events for their orders (delivery tracking)
- ❌ Cannot create, modify, or delete events

#### Drivers Table:
- ❌ **NO ACCESS** to driver information

### Use Cases:
- View order status and tracking information
- See delivery history and dispatch events
- Monitor real-time delivery progress

### UI Access:
- Customer Dashboard (`/customer/dashboard`)
- Order Tracking Page (`/track/[orderId]`)

---

## 3. DRIVER (Authenticated Delivery Drivers)

**Who:** Delivery drivers assigned to transport orders

### Permissions:

#### Drivers Table:
- ✅ **READ/UPDATE** their own driver profile
- ✅ **READ** all driver profiles (for reference)
- ❌ Cannot create or delete driver accounts

#### Orders Table:
- ✅ **READ** orders assigned to them only
- ✅ **UPDATE** status of assigned orders only
  - Status transitions validated by `validate_order_transition` trigger
  - Can progress: `Assigned` → `Accepted` → `PickedUp` → `InTransit` → `Delivered`
  - Can cancel from any non-final state
- ❌ Cannot modify price, customer info, or assign orders
- ❌ Cannot see orders assigned to other drivers

#### Dispatch Events Table:
- ✅ **READ** dispatch events for their assigned orders
- ❌ Cannot create, modify, or delete events (system-generated)

#### Customers, Quotes, Webhook Events:
- ❌ **NO ACCESS**

### Use Cases:
- View orders assigned to them
- Update order status as delivery progresses
- Accept or reject assignments
- Mark orders as picked up, in transit, or delivered

### UI Access:
- Driver Dashboard (`/driver`)

---

## 4. DISPATCHER (Operations Staff)

**Who:** Staff members managing order dispatch and driver assignments

### Permissions:

#### Orders Table:
- ✅ **FULL CRUD** access to all orders
  - Create, read, update, delete any order
  - Assign orders to drivers
  - Modify order status (with transition validation)

#### Drivers Table:
- ✅ **FULL CRUD** access to all drivers
  - Add new drivers
  - View all driver information
  - Update driver profiles
  - Deactivate/remove drivers

#### Dispatch Events Table:
- ✅ **FULL CRUD** access to all dispatch events
  - Create manual dispatch events
  - View complete audit trail
  - (Delete restricted by append-only trigger)

#### Customers Table:
- ✅ **READ** all customer records
- ⚠️ **LIMITED WRITE** (typically managed by service role)

#### Quotes Table:
- ✅ **READ** all quotes
- ⚠️ **LIMITED WRITE** (typically managed by service role)

#### Webhook Events:
- ❌ **NO ACCESS** (service role only)

### Use Cases:
- View all pending orders in dispatch queue
- Assign orders to available drivers
- Monitor driver status and availability
- Manage order lifecycle
- View system audit trail

### UI Access:
- Dispatcher Dashboard (`/dispatcher`)

---

## 5. ADMIN (System Administrators)

**Who:** System administrators with full access

### Permissions:
- ✅ **FULL CRUD** access to ALL tables
- ✅ Same permissions as DISPATCHER
- ✅ Additional access to system configuration
- ✅ User management capabilities

### Use Cases:
- Everything DISPATCHER can do, plus:
- Manage user accounts and roles
- Configure system settings
- Access administrative functions
- Monitor system health

### UI Access:
- Admin Panel (`/admin`)
- All dispatcher functions

---

## 6. SERVICE_ROLE (Backend API)

**Who:** Server-side API operations only (not a user-facing role)

### Permissions:
- ✅ **FULL UNRESTRICTED** access to ALL tables
- ✅ Bypass all RLS policies
- ✅ Execute any database operation

### Use Cases:
- Stripe webhook processing
- API route handlers
- Automated system tasks
- Background jobs and cron tasks

### Security:
- ⚠️ **NEVER** expose service role key to frontend
- ⚠️ Must be stored in environment variables only
- ⚠️ Used exclusively in server-side code

---

## Permission Matrix

| Table | Anonymous | Recipient | Driver | Dispatcher | Admin | Service Role |
|-------|-----------|-----------|--------|------------|-------|--------------|
| **customers** | INSERT only | READ own | - | READ all | FULL | FULL |
| **quotes** | INSERT only | READ own | - | READ all | FULL | FULL |
| **orders** | - | READ own | READ/UPDATE assigned | FULL | FULL | FULL |
| **drivers** | - | - | READ all, UPDATE own | FULL | FULL | FULL |
| **dispatch_events** | - | READ own | READ assigned | FULL | FULL | FULL |
| **webhook_events** | - | - | - | - | - | FULL |
| **users** | - | READ own | READ own | READ all | FULL | FULL |
| **api_rate_limits** | - | - | - | - | - | FULL |

---

## Role Assignment

### How roles are determined:

1. **ANONYMOUS**: No authentication token present
2. **RECIPIENT**: User has `auth_email` in `customers` table matching `auth.email()`
3. **DRIVER**: User has `user_id` in `drivers` table matching `auth.uid()`
4. **DISPATCHER**: User has `role = 'dispatcher'` in `users` table
5. **ADMIN**: User has `role = 'admin'` in `users` table
6. **SERVICE_ROLE**: Authenticated with `SUPABASE_SERVICE_ROLE_KEY`

### Priority order (when user has multiple roles):
1. SERVICE_ROLE (always highest)
2. ADMIN
3. DISPATCHER
4. DRIVER
5. RECIPIENT
6. ANONYMOUS

---

## Security Notes

### Key Principles:
- **Least Privilege**: Users have only the minimum permissions needed
- **Role Separation**: Clear boundaries between customer, operational, and administrative roles
- **Audit Trail**: All operations logged via `dispatch_events`
- **Status Validation**: Order status transitions validated by database triggers
- **Append-Only Events**: Dispatch events cannot be modified after creation

### Important Constraints:
- Drivers can only update **status** field on assigned orders (enforced by trigger)
- Status transitions follow strict state machine (see trigger validation)
- Recipients can only **read** data, never modify
- Service role operations should always be logged to dispatch_events

---

## Implementation Files

### Database Schema:
- `/supabase/consolidated-schema.sql` - Complete RLS policies

### Helper Functions:
- `current_user_role()` - Returns user's role from users table
- `is_admin_or_dispatcher()` - Boolean check for privileged access

### UI Components:
- `/app/customer/dashboard/` - Recipient interface
- `/app/driver/` - Driver interface
- `/app/dispatcher/` - Dispatcher interface
- `/app/admin/` - Admin interface

---

## Testing Access Control

### Test scenarios for each role:

```typescript
// Example: Test driver can only see assigned orders
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId);

// Driver should only see order if driver_id matches their user_id
// Other orders should return empty result (not error)
```

### Recommended tests:
1. ✅ RECIPIENT cannot see other customers' orders
2. ✅ DRIVER cannot update orders not assigned to them
3. ✅ DRIVER cannot modify customer information
4. ✅ ANONYMOUS cannot read any existing data
5. ✅ DISPATCHER can see all orders
6. ✅ Status transitions follow legal paths only

---

## Troubleshooting

### Common issues:

**"Row-level security policy violation"**
- User attempting operation outside their permissions
- Check if user has correct role in `users` table
- Verify `auth_email` for recipients or `user_id` for drivers

**"No rows returned"**
- RLS filtering data user doesn't have access to
- This is expected behavior (not an error)

**Driver can't update order status**
- Verify driver_id matches user's driver record
- Check status transition is legal (see state machine)
- Ensure order isn't in final state (Delivered/Canceled)

---

**Last Updated:** October 2, 2025

