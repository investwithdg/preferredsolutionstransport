# Data Flow & Architecture

This document provides a comprehensive view of how data flows between Supabase (operational database) and HubSpot (CRM), and outlines the overall system architecture.

## Core Principles

1.  **Supabase is the operational source of truth**: All operational data (orders, drivers, locations) lives in Supabase.
2.  **HubSpot is the sales view**: HubSpot maintains sales-specific data and pipeline visibility.
3.  **Minimal bidirectional sync**: Only essential fields are synchronized to optimize performance and prevent complexity.
4.  **Role-based data access**: Users see only the data they need for their role, enforced at the database level.

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

## Data Ownership

| Data Type | Owner | Location | Sync Direction | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Order Details | Supabase | `orders` table | → HubSpot (minimal) | Addresses, times, amounts |
| Customer Info | Supabase | `customers` table | → HubSpot (create only) | Name, email, phone |
| Driver Assignment | Supabase | `orders.driver_id` | → HubSpot (name only) | Full driver data in Supabase |
| Delivery Instructions| HubSpot | `orders.hubspot_metadata`| ← HubSpot | Sales-entered special instructions |
| Order Status | Supabase | `orders.status` | → HubSpot | Maps to deal stage |
| Sales Pipeline | HubSpot | Deal Stage | Read-only | Never syncs back to Supabase |

## Synchronization Strategy

### From Supabase → HubSpot (Minimal Sync)

Only a minimal set of fields are pushed to HubSpot to update the deal stage and provide visibility to the sales team. This happens on order status changes or driver assignment.

### From HubSpot → Supabase (Cached Metadata)

A small, specific set of non-operational fields (like `specialDeliveryInstructions`) are received from HubSpot via webhooks and cached in a `hubspot_metadata` JSONB column in the `orders` table. This avoids making live API calls to HubSpot from the UI.

## Role-Based Data Access

Data visibility is controlled at the database level using a SQL view (`orders_with_filtered_metadata`) that filters the `hubspot_metadata` based on the user's role.

-   **Driver**: Sees only `special_delivery_instructions`.
-   **Dispatcher**: Sees instructions, `recurring_frequency`, and `rush_requested`.
-   **Customer**: Sees only `special_delivery_instructions`.
-   **Admin**: Sees all unfiltered HubSpot metadata.

## Performance & Security

-   **No UI Blocking**: The UI never waits for the HubSpot API, ensuring a fast user experience. All HubSpot data is read from the Supabase cache.
-   **Minimal API Calls**: The minimal sync strategy reduces API calls and avoids hitting rate limits.
-   **Database-Level Security**: Row Level Security (RLS) policies and role-based views ensure that users can only access the data they are authorized to see.

For more details on implementation, see **[Implementation Details](IMPLEMENTATION.md)**.
