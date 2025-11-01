<!-- 9baa5ed5-ffca-430b-8b36-d3b6d0265e05 ebe0d0d4-a96f-4217-919e-3396c5d8e6f9 -->

# MVP Data Architecture Implementation Plan

## Overview

Simplify the HubSpot-Supabase integration by minimizing synchronized fields and using Supabase as the primary operational database. HubSpot becomes a sales-view only system with minimal bidirectional sync.

## Data Architecture

### Supabase (Operational Truth)

```
orders table:
├── Core operational fields (id, addresses, times, status)
├── driver_id → drivers table
├── customer_id → customers table
├── hubspot_deal_id (link to HubSpot)
└── hubspot_metadata (JSONB with minimal cache)
    ├── special_delivery_instructions
    ├── recurring_frequency
    └── rush_requested
```

### HubSpot (Sales View)

```
Deals:
├── order_id (reference back to Supabase)
├── dealstage (pipeline visibility)
├── amount (financial tracking)
└── Custom Properties (only sync these):
    ├── delivery_status
    ├── assigned_driver
    └── actual_delivery_time
```

## Phase 1: Database Schema Updates

### 1.1 Add Minimal Metadata Function

Create `get_minimal_hubspot_metadata()` function that returns only essential cached fields based on user role.

### 1.2 Update RLS Policies

Modify existing RLS policies to use the minimal metadata approach.

### 1.3 Add Sync Status Tracking

Add fields to track what's synced and when, to prevent unnecessary API calls.

## Phase 2: Simplify HubSpot Integration

### 2.1 Reduce Property Mappings

Update `property-mappings.ts` to only map essential fields:

- **TO HubSpot**: delivery_status, assigned_driver, actual_delivery_time
- **FROM HubSpot**: special_delivery_instructions, recurring_frequency, rush_requested

### 2.2 Update Webhook Handler

Modify webhook handler to only process changes to the minimal field set.

### 2.3 Optimize Sync Function

Update `syncOrderToHubSpot()` to skip non-essential fields.

## Phase 3: UI Data Layer

### 3.1 Create Simplified Order Fetch

Build a single query that returns all role-appropriate data from Supabase with minimal HubSpot metadata.

### 3.2 Update Components by Role

**Driver View**:

```typescript
{
  // From Supabase
  (pickup_address,
    dropoff_address,
    scheduled_pickup_time,
    scheduled_delivery_time,
    customer_name,
    customer_phone,
    // From hubspot_metadata
    special_delivery_instructions);
}
```

**Dispatcher View**:

```typescript
{
  // All driver fields plus:
  (driver_id,
    vehicle_type,
    status,
    // From hubspot_metadata
    recurring_frequency,
    rush_requested);
}
```

**Customer View**:

```typescript
{
  // Minimal fields
  (status, scheduled_delivery_time, driver_name, driver_phone, special_delivery_instructions);
}
```

### 3.3 Remove Unnecessary API Calls

Eliminate any direct HubSpot API calls from UI components.

## Phase 4: Testing & Validation

### 4.1 Test Minimal Sync

Verify only essential fields sync between systems.

### 4.2 Performance Testing

Ensure UI loads fast without HubSpot dependencies.

### 4.3 Role-Based Testing

Confirm each role sees only appropriate data.

## Implementation Checklist

### Week 1: Database & Backend

- [ ] Create minimal metadata function
- [ ] Update RLS policies
- [ ] Simplify property mappings
- [ ] Update sync functions

### Week 2: Frontend & Testing

- [ ] Update UI data fetching
- [ ] Remove unnecessary HubSpot calls
- [ ] Test all user roles
- [ ] Performance optimization

## Success Metrics

- UI loads in <1 second (no HubSpot API delays)
- Only 3 fields sync to HubSpot (vs 30+)
- Only 3 fields cache from HubSpot
- Zero duplicate data entry
- Clear source of truth for each field

### To-dos

- [ ] Add get_safe_hubspot_metadata() function to filter JSONB by user role
- [ ] Create validate_hubspot_metadata() function to ensure data consistency
- [ ] Modify order RLS policies to use metadata filtering function
- [ ] Review and document which HubSpot properties should be cached vs fetched
- [ ] Enhance webhook handler to validate and selectively cache properties
- [ ] Create unified order fetch endpoint that includes filtered metadata
- [ ] Add admin-only endpoint for fresh HubSpot data fetching
- [ ] Update React hooks to use cached metadata instead of API calls
- [ ] Add 'View in HubSpot' buttons for admin users
- [ ] Create comprehensive documentation of data ownership and flow
- [ ] Test each role (driver, dispatcher, admin, customer) sees correct data
