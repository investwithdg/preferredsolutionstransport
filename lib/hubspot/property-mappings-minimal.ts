/**
 * HubSpot Minimal Property Mappings
 *
 * This file implements the MVP data architecture with minimal sync.
 * Only essential fields are synchronized between systems.
 */

import { getDealStageForStatus } from './config';

/**
 * Properties that sync FROM Supabase TO HubSpot
 * These are the only operational fields that HubSpot needs for sales visibility
 */
export const SYNC_TO_HUBSPOT = {
  // Delivery status for pipeline visibility
  delivery_status: (status: string) => {
    const prop = process.env.HUBSPOT_PROP_DELIVERY_STATUS || 'delivery_status';
    return {
      [prop]: status,
      dealstage: getDealStageForStatus(status), // Also update deal stage
    };
  },

  // Assigned driver name for sales reference
  assigned_driver: (driverName: string | null) => {
    const prop = process.env.HUBSPOT_PROP_ASSIGNED_DRIVER || 'assigned_driver';
    return {
      [prop]: driverName || 'Unassigned',
    };
  },

  // Actual delivery time for completion tracking
  actual_delivery_time: (timestamp: string | null) => {
    const prop = process.env.HUBSPOT_PROP_ACTUAL_DELIVERY_TIME || 'actual_delivery_time';
    return timestamp
      ? {
          [prop]: new Date(timestamp).toISOString(),
        }
      : {};
  },
};

/**
 * Properties that cache FROM HubSpot TO Supabase
 * These are sales-entered fields that operations needs
 */
export const CACHE_FROM_HUBSPOT = [
  'special_delivery_instructions',
  'recurring_frequency',
  'rush_requested',
];

/**
 * Get environment-configured property name
 */
export function getHubSpotPropertyName(internalName: string): string {
  const envMapping: Record<string, string> = {
    special_delivery_instructions:
      process.env.HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS || 'special_delivery_instructions',
    recurring_frequency: process.env.HUBSPOT_PROP_RECURRING_FREQUENCY || 'recurring_frequency',
    rush_requested: process.env.HUBSPOT_PROP_RUSH_REQUESTED || 'rush_requested',
    delivery_status: process.env.HUBSPOT_PROP_DELIVERY_STATUS || 'delivery_status',
    assigned_driver: process.env.HUBSPOT_PROP_ASSIGNED_DRIVER || 'assigned_driver',
    actual_delivery_time: process.env.HUBSPOT_PROP_ACTUAL_DELIVERY_TIME || 'actual_delivery_time',
  };

  return envMapping[internalName] || internalName;
}

/**
 * Build minimal deal update payload
 */
export function buildMinimalDealUpdate(order: any): Record<string, any> {
  const properties: Record<string, any> = {};

  // Only sync our 3 operational fields
  if (order.status) {
    Object.assign(properties, SYNC_TO_HUBSPOT.delivery_status(order.status));
  }

  if (order.driver?.name) {
    Object.assign(properties, SYNC_TO_HUBSPOT.assigned_driver(order.driver.name));
  }

  if (order.actual_delivery_time) {
    Object.assign(properties, SYNC_TO_HUBSPOT.actual_delivery_time(order.actual_delivery_time));
  }

  return properties;
}

/**
 * Extract cacheable metadata from HubSpot deal
 */
export function extractCacheableMetadata(dealProperties: Record<string, any>): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Only extract our 3 cacheable fields
  for (const field of CACHE_FROM_HUBSPOT) {
    const hubspotProp = getHubSpotPropertyName(field);
    if (dealProperties[hubspotProp] !== undefined) {
      // Convert to our internal camelCase format
      const camelCaseKey = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      metadata[camelCaseKey] = dealProperties[hubspotProp];
    }
  }

  return metadata;
}
