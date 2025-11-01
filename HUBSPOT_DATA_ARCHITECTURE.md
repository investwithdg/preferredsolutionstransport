# HubSpot Data Architecture Documentation

## Overview

This document defines the data ownership and synchronization strategy between Supabase (operational database) and HubSpot (sales CRM).

## Core Principles

1. **Supabase is the operational source of truth** - All operational data lives in Supabase
2. **HubSpot is the sales view** - HubSpot maintains sales-specific data and pipeline visibility
3. **Minimal bidirectional sync** - Only essential fields are synchronized to prevent complexity
4. **Role-based data access** - Users see only the data they need for their role

## Data Ownership

### Supabase-Owned Data (Operational)

These fields are mastered in Supabase and should NOT be edited in HubSpot:

- **Order Details**
  - `order_number`
  - `pickup_address`, `pickup_city`, `pickup_state`, `pickup_zip`
  - `dropoff_address`, `dropoff_city`, `dropoff_state`, `dropoff_zip`
  - `scheduled_pickup_time`, `scheduled_delivery_time`
  - `actual_pickup_time`, `actual_delivery_time`
  - `vehicle_type`
  - `priority`

- **Customer Information**
  - `recipient_name`
  - `recipient_email`
  - `recipient_phone`

- **Driver Assignment**
  - `driver_id`
  - Driver details (name, phone, vehicle)

- **Operational Status**
  - `status` (pending, assigned, in_transit, delivered, cancelled)
  - `payment_status`

### HubSpot-Owned Data (Sales/CRM)

These fields originate in HubSpot and are cached in Supabase:

- **Sales Instructions** (cached in `hubspot_metadata`)
  - `specialDeliveryInstructions` - Special handling notes from sales
  - `recurringFrequency` - For recurring delivery contracts
  - `rushRequested` - Priority/rush delivery flag

- **Deal Information** (HubSpot native)
  - `dealstage` - Sales pipeline stage
  - `amount` - Deal value
  - `closedate` - Expected close date
  - Owner assignment
  - Associated contacts/companies

## Synchronization Strategy

### From Supabase → HubSpot

**When**: On order status changes or driver assignment
**What**: Only these fields sync to HubSpot:

- `delivery_status` → Updates deal stage
- `assigned_driver` → Driver name for visibility
- `actual_delivery_time` → Completion tracking

### From HubSpot → Supabase

**When**: Via webhook on deal property changes
**What**: Only these fields are cached:

- `specialDeliveryInstructions`
- `recurringFrequency`
- `rushRequested`

## Role-Based Data Access

### Driver View

```json
{
  // Core operational data from Supabase
  "pickup_address": "...",
  "dropoff_address": "...",
  "scheduled_times": "...",
  "customer_contact": "...",

  // From HubSpot cache (filtered)
  "special_delivery_instructions": "..."
}
```

### Dispatcher View

```json
{
  // All driver fields plus:
  "driver_assignment": "...",
  "vehicle_type": "...",
  "status": "...",

  // Additional HubSpot cache
  "recurring_frequency": "...",
  "rush_requested": true/false
}
```

### Customer View

```json
{
  // Minimal operational data
  "status": "...",
  "scheduled_delivery_time": "...",
  "driver_contact": "...",
  "special_delivery_instructions": "..."
}
```

### Admin View

- Full access to all Supabase data
- Full access to all cached HubSpot metadata
- Direct links to view/edit in HubSpot

## Implementation Guidelines

### 1. Property Mapping Configuration

Use environment variables for HubSpot property names:

```
HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS=special_delivery_instructions
HUBSPOT_PROP_RECURRING_FREQUENCY=recurring_frequency
HUBSPOT_PROP_RUSH_REQUESTED=rush_requested
```

### 2. Validation Rules

- **Special Delivery Instructions**: Max 500 characters
- **Recurring Frequency**: Enum (weekly, biweekly, monthly, none)
- **Rush Requested**: Boolean

### 3. Error Handling

- Invalid HubSpot data is filtered by `validate_hubspot_metadata()`
- Missing properties gracefully default to null
- Webhook errors don't block operational flow

## Deprecated Properties

The following HubSpot properties should NOT be used (duplicates Supabase data):

- Customer address fields
- Delivery time fields
- Order amount fields
- Any operational status beyond the 3 synced fields

## Future Considerations

1. **Invoice Integration**: When ready, invoice data will flow from HubSpot's native invoice object
2. **Reporting**: Analytics should pull from Supabase with HubSpot data for sales metrics only
3. **Bulk Operations**: Batch sync operations should respect the minimal field set

## Testing Checklist

- [ ] Driver sees only delivery instructions
- [ ] Dispatcher sees instructions + scheduling metadata
- [ ] Customer sees minimal order status
- [ ] Admin sees everything
- [ ] HubSpot changes reflect in <5 seconds
- [ ] Invalid HubSpot data doesn't break the app
- [ ] Operational updates sync to HubSpot correctly
