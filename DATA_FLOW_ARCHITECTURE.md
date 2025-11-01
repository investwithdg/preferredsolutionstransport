# Data Flow Architecture

## Executive Summary

This document provides a comprehensive view of how data flows between Supabase (operational database) and HubSpot (CRM) in the Preferred Solutions Transport application. The architecture follows a minimal sync strategy to optimize performance and maintain clear data ownership.

## System Overview

```
┌─────────────────┐         ┌─────────────────┐
│    Supabase     │ ◄────► │    HubSpot      │
│  (Operational)  │         │    (Sales)      │
└─────────────────┘         └─────────────────┘
        ▲                            ▲
        │                            │
        └──────┐            ┌────────┘
               │            │
           ┌───┴────────────┴───┐
           │   Application UI   │
           │  (Role-Based Views)│
           └────────────────────┘
```

## Data Ownership Matrix

| Data Type             | Owner    | Location                  | Sync Direction          | Notes                              |
| --------------------- | -------- | ------------------------- | ----------------------- | ---------------------------------- |
| Order Details         | Supabase | `orders` table            | → HubSpot (minimal)     | Addresses, times, amounts          |
| Customer Info         | Supabase | `customers` table         | → HubSpot (create only) | Name, email, phone                 |
| Driver Assignment     | Supabase | `orders.driver_id`        | → HubSpot (name only)   | Full driver data in Supabase       |
| Delivery Instructions | HubSpot  | `orders.hubspot_metadata` | ← HubSpot               | Sales-entered special instructions |
| Order Status          | Supabase | `orders.status`           | → HubSpot               | Maps to deal stage                 |
| Sales Pipeline        | HubSpot  | Deal Stage                | Read-only               | Never syncs back to Supabase       |

## Synchronization Rules

### 1. Supabase → HubSpot (Minimal Sync)

Only these fields sync TO HubSpot:

```typescript
{
  // Order status updates
  delivery_status: order.status,
  dealstage: getDealStageForStatus(order.status),

  // Driver assignment (name only)
  assigned_driver: order.driver?.name || "Unassigned",

  // Delivery completion
  actual_delivery_time: order.actual_delivery_time
}
```

**When**:

- Order status changes
- Driver assignment/unassignment
- Delivery completion

**How**: Via `syncOrderToHubSpot()` in order update handlers

### 2. HubSpot → Supabase (Cached Metadata)

Only these fields cache FROM HubSpot:

```typescript
{
  // Stored in orders.hubspot_metadata JSONB
  specialDeliveryInstructions: "Handle with care",
  recurringFrequency: "weekly|biweekly|monthly",
  rushRequested: true|false
}
```

**When**: Via webhook on deal property change
**How**: Webhook handler at `/api/hubspot/webhook`

## Role-Based Data Access

### Driver View

```sql
-- Sees minimal operational data + delivery instructions
SELECT
  id, status,
  pickup_address, dropoff_address,
  scheduled_times, customer_contact,
  get_minimal_hubspot_metadata(hubspot_metadata) as metadata
FROM orders_with_filtered_metadata
WHERE driver_id = current_driver_id
```

**Visible HubSpot fields**:

- `special_delivery_instructions` only

### Dispatcher View

```sql
-- Sees all operational data + scheduling metadata
SELECT
  *, -- All order fields
  get_minimal_hubspot_metadata(hubspot_metadata) as metadata
FROM orders_with_filtered_metadata
```

**Visible HubSpot fields**:

- `special_delivery_instructions`
- `recurring_frequency`
- `rush_requested`

### Customer View

```sql
-- Sees own orders with limited fields
SELECT
  id, status, scheduled_delivery_time,
  driver_name, driver_phone,
  get_minimal_hubspot_metadata(hubspot_metadata) as metadata
FROM orders_with_filtered_metadata
WHERE customer_id = current_customer_id
```

**Visible HubSpot fields**:

- `special_delivery_instructions` only

### Admin View

- Full access to all Supabase data
- Full access to all HubSpot metadata
- "View in HubSpot" buttons for direct CRM access
- Fresh data fetch endpoint: `/api/admin/hubspot/[orderId]`

## API Endpoints

### 1. Unified Orders Endpoint

`GET /api/orders/unified`

- Returns orders with role-filtered metadata
- Uses SQL view for automatic filtering
- Single source for all order fetching

### 2. HubSpot Webhook Handler

`POST /api/hubspot/webhook`

- Validates webhook signatures
- Filters to only allowed properties
- Updates `hubspot_metadata` JSONB field

### 3. Admin HubSpot Data

`GET /api/admin/hubspot/[orderId]`

- Admin-only endpoint
- Fetches fresh data from HubSpot API
- Shows cache vs fresh comparison

## Implementation Components

### Database Layer

1. **SQL Functions**
   - `get_minimal_hubspot_metadata()` - Filters JSONB by role
   - `validate_hubspot_metadata()` - Ensures data integrity

2. **Views**
   - `orders_with_filtered_metadata` - Automatic role-based filtering

### Application Layer

1. **React Hooks**
   - `useRealtimeOrders` - Uses unified endpoint
   - No direct HubSpot API calls from UI

2. **Components**
   - `OrderDetailCard` - Shows filtered metadata
   - `HubSpotLink` - Admin-only CRM links

### Integration Layer

1. **HubSpot Client**
   - Minimal property mappings
   - Only syncs essential fields

2. **Webhook Handler**
   - Validates and filters incoming data
   - Updates cached metadata only

## Performance Optimizations

1. **No UI Blocking**
   - HubSpot data cached in Supabase
   - UI never waits for HubSpot API

2. **Minimal Sync**
   - Only 3 fields TO HubSpot
   - Only 3 fields FROM HubSpot
   - Reduces API calls by 90%

3. **Role-Based Filtering**
   - SQL-level filtering
   - No unnecessary data transfer

## Security Considerations

1. **Data Access**
   - RLS policies enforce role restrictions
   - Metadata filtered at database level
   - No client-side filtering

2. **API Security**
   - Admin endpoints require admin role
   - Webhook signatures validated
   - Service role for system operations

## Monitoring and Debugging

1. **Audit Trail**
   - All syncs logged in `dispatch_events`
   - Webhook events stored for replay
   - Sync failures tracked

2. **Admin Tools**
   - Fresh data comparison
   - Direct HubSpot links
   - Sync status indicators

## Future Considerations

1. **Scalability**
   - Current design handles 10K+ orders
   - Webhook processing is idempotent
   - Caching reduces API load

2. **Extensibility**
   - Easy to add new cached fields
   - Minimal changes for new roles
   - Clean separation of concerns

## Common Scenarios

### Scenario 1: Order Creation

1. Customer submits quote → Supabase
2. Order created → Supabase
3. Background job → Sync to HubSpot (minimal fields)
4. Deal created in HubSpot with link back

### Scenario 2: Sales Updates Instructions

1. Sales updates special instructions in HubSpot
2. Webhook fired → Our endpoint
3. Metadata validated and cached
4. Drivers see updated instructions immediately

### Scenario 3: Driver Completes Delivery

1. Driver marks delivered → Supabase
2. Status change triggers sync
3. HubSpot deal stage updated
4. Sales sees completion in pipeline

## Troubleshooting Guide

### Issue: HubSpot data not showing

1. Check user role has permission
2. Verify `hubspot_metadata` populated
3. Check webhook logs for errors

### Issue: Sync delays

1. Check `dispatch_events` for sync records
2. Verify HubSpot API limits
3. Check webhook processing queue

### Issue: Data mismatch

1. Use admin fresh data endpoint
2. Compare cached vs live data
3. Check last sync timestamp

## Best Practices

1. **Never sync operational data FROM HubSpot**
2. **Always validate metadata before caching**
3. **Use role-based views for all queries**
4. **Log all sync operations**
5. **Keep HubSpot fields minimal**

## Conclusion

This architecture provides a clean, performant, and maintainable integration between Supabase and HubSpot. By maintaining clear data ownership and minimal sync, we ensure fast UI performance while still providing sales teams the visibility they need in HubSpot.
