# HubSpot Custom Property Management System

## Overview

This system provides automatic validation, mapping, and synchronization of HubSpot custom properties. It ensures that all contact and deal fields are consistently and accurately populated every time data is synced to HubSpot.

## Key Features

- **Automatic Schema Fetching**: Retrieves property definitions from HubSpot API
- **Property Validation**: Validates data types, constraints, and enum values before syncing
- **Intelligent Caching**: Reduces API calls with configurable TTL
- **Fallback Mechanism**: Uses cached schemas when API is unavailable
- **Type Safety**: TypeScript types for all properties and sync operations
- **Flexible Mapping**: Environment variable configuration for custom property names
- **Comprehensive Logging**: Detailed error messages and warnings

## Architecture

### Core Components

```
lib/hubspot/
├── types.ts              # TypeScript interfaces and types
├── schemas.ts            # Property schema fetching and caching
├── validator.ts          # Property validation logic
├── property-mappings.ts  # Order-to-HubSpot property mappings
├── client.ts             # Enhanced HubSpot API client
└── config.ts             # Pipeline and stage configuration
```

### Data Flow

```
Order Data → Property Mapping → Validation → HubSpot API
                                    ↓
                            Schema Cache (1hr TTL)
                                    ↓
                            HubSpot Property Schema
```

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# HubSpot API Token (Required)
HUBSPOT_PRIVATE_APP_TOKEN=your_token_here

# Pipeline Configuration (Optional)
HUBSPOT_PIPELINE_ID=default
HUBSPOT_STAGE_READY=appointmentscheduled
HUBSPOT_STAGE_ASSIGNED=qualifiedtobuy
HUBSPOT_STAGE_PICKED_UP=presentationscheduled
HUBSPOT_STAGE_DELIVERED=closedwon
HUBSPOT_STAGE_CANCELED=closedlost

# Custom Property Names (Optional - must match your HubSpot property internal names)
HUBSPOT_PROP_ORDER_ID=order_id
HUBSPOT_PROP_PICKUP_ADDRESS=pickup_address
HUBSPOT_PROP_DROPOFF_ADDRESS=dropoff_address
HUBSPOT_PROP_DISTANCE_MILES=distance_miles
HUBSPOT_PROP_PIPELINE_FLOW=pipeline_flow
HUBSPOT_PROP_DRIVER_NAME=driver_name
HUBSPOT_PROP_DRIVER_PHONE=driver_phone

# Cache Settings (Optional)
HUBSPOT_SCHEMA_CACHE_TTL=3600        # Cache duration in seconds (default: 1 hour)
HUBSPOT_SCHEMA_CACHE_ENABLED=true    # Enable/disable caching (default: true)
```

### Creating Custom Properties in HubSpot

1. Go to **Settings** → **Properties** in HubSpot
2. Select **Deals** (or **Contacts**)
3. Click **Create property**
4. Configure the property:
   - **Label**: Display name (e.g., "Order ID")
   - **Internal name**: Must match your env variable (e.g., `order_id`)
   - **Field type**: Choose appropriate type (text, number, etc.)
   - **Group**: Optional, for organization

5. Save and note the internal name

### Property Types

| Internal Name | Type | Description |
|---------------|------|-------------|
| `order_id` | Single-line text | Unique order identifier |
| `pickup_address` | Multi-line text | Pickup location |
| `dropoff_address` | Multi-line text | Delivery destination |
| `distance_miles` | Number | Distance in miles |
| `pipeline_flow` | Single-line text | Custom delivery stage tracking |
| `driver_name` | Single-line text | Assigned driver name |
| `driver_phone` | Phone number | Driver contact number |

## Usage

### Automatic Synchronization

The system automatically syncs data at these points:

1. **Order Creation** (Stripe webhook)
   - Creates contact
   - Creates deal with all order details
   - Sends confirmation email

2. **Driver Assignment**
   - Updates deal with driver information
   - Updates pipeline_flow custom property
   - Updates standard dealstage

3. **Status Changes**
   - Updates deal properties
   - Updates pipeline_flow with new status
   - Syncs timestamps

### Manual Synchronization

```typescript
import { createHubSpotClient, syncOrderToHubSpot } from '@/lib/hubspot/client';
import type { OrderSyncData } from '@/lib/hubspot/types';

const hubspotClient = createHubSpotClient();

if (hubspotClient) {
  const orderData: OrderSyncData = {
    orderId: 'order-123',
    customerId: 'customer-456',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    priceTotal: 150.00,
    currency: 'usd',
    status: 'ReadyForDispatch',
    pickupAddress: '123 Main St',
    dropoffAddress: '456 Oak Ave',
    distanceMiles: 25.5,
    driverId: 'driver-789',
    driverName: 'Jane Smith',
    driverPhone: '+0987654321',
    createdAt: new Date(),
  };

  const result = await syncOrderToHubSpot(hubspotClient, orderData);

  if (result.success) {
    console.log('Synced successfully!');
    console.log('Contact ID:', result.contactId);
    console.log('Deal ID:', result.dealId);
  } else {
    console.error('Sync errors:', result.errors);
  }

  if (result.warnings) {
    console.warn('Warnings:', result.warnings);
  }
}
```

### Updating Existing Deals

```typescript
import { updateHubSpotDeal, findDealByOrderId } from '@/lib/hubspot/client';
import { mapOrderToDealProperties } from '@/lib/hubspot/property-mappings';

// Find deal by order ID
const dealId = await findDealByOrderId(hubspotClient, orderId);

if (dealId) {
  // Map order data to deal properties
  const dealProperties = mapOrderToDealProperties(orderData);
  
  // Update the deal
  const updated = await updateHubSpotDeal(hubspotClient, dealId, dealProperties);
  
  if (updated) {
    console.log('Deal updated successfully');
  }
}
```

## Validation

### Property Validation Script

Run the validation script to verify your configuration:

```bash
node scripts/validate-hubspot-properties.js
```

This script:
- ✓ Checks HubSpot connection
- ✓ Verifies all custom properties exist
- ✓ Validates property types
- ✓ Checks pipeline and stage configuration
- ✓ Reports missing or misconfigured properties
- ✓ Suggests fixes for issues

### Example Output

```
=============================================================
HubSpot Property Validation Tool
=============================================================

✓ Found HubSpot API token

=============================================================
Deal Properties Validation
=============================================================

✓ Found 7 configured properties:

  order_id
    Label: Order ID
    Type: string
    Required: No

  pickup_address
    Label: Pickup Address
    Type: text
    Required: No

...

✗ Missing 1 properties:

  pipeline_flow

ℹ To create these properties in HubSpot:
  1. Go to Settings > Properties
  2. Select "deals"
  3. Click "Create property"
  4. Configure each missing property with appropriate type

=============================================================
Pipeline Configuration Validation
=============================================================

✓ Found pipeline: Default Sales Pipeline (ID: default)

ℹ Configured deal stages:

✓ Ready for Dispatch: Appointment Scheduled (appointmentscheduled)
✓ Assigned: Qualified to Buy (qualifiedtobuy)
✓ Picked Up: Presentation Scheduled (presentationscheduled)
✓ Delivered: Closed Won (closedwon)
✓ Canceled: Closed Lost (closedlost)

=============================================================
Validation Summary
=============================================================

⚠ Some validations failed. Please review the errors above.

ℹ The application will still work, but some properties may not be synced.
```

## How It Works

### 1. Schema Fetching

On first API call:
1. Fetches all property definitions from HubSpot
2. Caches them in memory with TTL
3. Validates incoming data against schemas

Subsequent calls use cached schemas (refreshed after TTL expires).

### 2. Property Mapping

Transforms internal order data to HubSpot properties:

```typescript
// Internal data
{
  orderId: "uuid-123",
  priceTotal: 150.00,
  status: "Assigned"
}

// Mapped to HubSpot
{
  order_id: "uuid-123",
  amount: "150.00",          // Formatted as string
  dealstage: "qualifiedtobuy", // Mapped from status
  pipeline_flow: "Assigned"   // Custom property
}
```

### 3. Validation

Before sending to HubSpot:
- Type checking (string, number, date, enum)
- Required field validation
- Enum value validation
- Read-only property filtering
- Constraint checking

### 4. Error Handling

- **Schema fetch fails**: Uses cached data or proceeds without validation
- **Validation fails**: Logs warnings but continues sync
- **API call fails**: Returns detailed error information
- **Missing properties**: Filtered out automatically

## Standard vs Custom Properties

### Standard HubSpot Deal Properties

These are built-in and always available:
- `dealname` - Deal name
- `amount` - Deal value
- `pipeline` - Pipeline ID
- `dealstage` - Current stage
- `closedate` - Expected close date

### Custom Properties

These must be created in HubSpot:
- `order_id` - Your order identifier
- `pickup_address` - Pickup location
- `dropoff_address` - Delivery destination
- `distance_miles` - Distance
- `pipeline_flow` - Custom stage tracking (separate from standard `dealstage`)
- `driver_name` - Driver information
- `driver_phone` - Driver contact

### Why Separate Pipeline Flow?

Your configuration uses **two** stage tracking systems:

1. **Standard `dealstage`**: HubSpot's built-in pipeline stages
2. **Custom `pipeline_flow`**: Your delivery-specific stages

This allows you to:
- Keep HubSpot sales stages intact
- Track delivery-specific workflow separately
- Report on both dimensions independently

## Troubleshooting

### Properties Not Syncing

1. **Run validation script**:
   ```bash
   node scripts/validate-hubspot-properties.js
   ```

2. **Check environment variables**:
   - Verify property names match HubSpot internal names exactly
   - Check for typos in `.env.local`

3. **Check HubSpot token scopes**:
   - Contacts: Read, Write
   - Deals: Read, Write

### Validation Errors

Check application logs for:
```
Property 'pipeline_flow' not found in HubSpot schema
```

This means the property doesn't exist in HubSpot or the name doesn't match.

### Cache Issues

To clear the cache:
- Restart the application
- Or set `HUBSPOT_SCHEMA_CACHE_ENABLED=false` temporarily

### Performance Issues

If HubSpot API calls are slow:
- Increase cache TTL: `HUBSPOT_SCHEMA_CACHE_TTL=7200`
- Check HubSpot API rate limits
- Review application logs for excessive fetches

## API Reference

### `syncOrderToHubSpot(client, orderData, existingDealId?)`

Main sync function - creates/updates contact and deal atomically.

**Parameters:**
- `client`: HubSpot Client instance
- `orderData`: OrderSyncData object
- `existingDealId`: Optional, for updates

**Returns:** `SyncResult` with success status, IDs, errors, and warnings

### `updateHubSpotDeal(client, dealId, properties)`

Updates an existing deal with validated properties.

**Parameters:**
- `client`: HubSpot Client instance
- `dealId`: HubSpot deal ID
- `properties`: DealProperties object

**Returns:** `boolean` indicating success

### `findDealByOrderId(client, orderId)`

Searches for a deal by order ID custom property.

**Parameters:**
- `client`: HubSpot Client instance
- `orderId`: Your internal order ID

**Returns:** HubSpot deal ID or `undefined`

## Best Practices

1. **Always run validation script** after creating new custom properties
2. **Use environment variables** for property names (don't hardcode)
3. **Monitor logs** for validation warnings
4. **Keep cache enabled** in production for performance
5. **Test in development** before deploying property changes
6. **Document custom properties** in your team wiki
7. **Version control** your property configurations

## Migration from Old System

If upgrading from the basic HubSpot integration:

1. **No breaking changes** - old code continues to work
2. **New routes automatically use** the enhanced system
3. **Gradually migrate** old calls to `syncOrderToHubSpot()`
4. **Run validation script** to ensure configuration is correct
5. **Monitor logs** for any issues during transition

## Support

For issues or questions:
1. Check this documentation
2. Run the validation script
3. Review application logs
4. Check HubSpot API status
5. Verify property configuration in HubSpot UI

## Future Enhancements

Potential improvements:
- Webhook-based sync from HubSpot to app
- Bidirectional sync support
- Company object support
- Custom activity tracking
- Advanced field mapping rules
- Bulk sync operations
- Real-time validation UI

