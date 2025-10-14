/**
 * HubSpot Property Mappings
 * Defines how internal order/customer data maps to HubSpot properties
 */

import type { PropertyMapping, PropertyMappings, OrderSyncData, ContactProperties, DealProperties } from './types';
import { formatDealName, getDealStageForStatus } from './config';

/**
 * Data transformers for property values
 */
export const transformers = {
  /**
   * Format currency amount to string (HubSpot expects string for amount field)
   */
  formatCurrency: (value: number): string => {
    return value.toFixed(2);
  },

  /**
   * Format date to ISO string
   */
  formatDate: (value: Date | string): string => {
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    return value.toISOString();
  },

  /**
   * Format phone number (basic - remove non-numeric characters)
   */
  formatPhone: (value: string): string => {
    return value.replace(/[^\d+]/g, '');
  },

  /**
   * Ensure string type
   */
  toString: (value: any): string => {
    return String(value);
  },

  /**
   * Round number to 2 decimal places
   */
  roundNumber: (value: number): number => {
    return Math.round(value * 100) / 100;
  },
};

/**
 * Get property name from environment or use default
 */
function getPropertyName(envKey: string, defaultName: string): string {
  return process.env[envKey] || defaultName;
}

/**
 * Contact property mappings
 */
export const contactMappings: Record<string, PropertyMapping> = {
  email: {
    hubspotProperty: 'email',
    required: true,
  },
  firstname: {
    hubspotProperty: 'firstname',
    required: false,
  },
  lastname: {
    hubspotProperty: 'lastname',
    required: false,
  },
  phone: {
    hubspotProperty: 'phone',
    required: false,
    transformer: transformers.formatPhone,
  },
};

/**
 * Deal property mappings
 */
export const dealMappings: Record<string, PropertyMapping> = {
  dealname: {
    hubspotProperty: 'dealname',
    required: true,
  },
  amount: {
    hubspotProperty: 'amount',
    required: false,
    transformer: transformers.formatCurrency,
  },
  pipeline: {
    hubspotProperty: 'pipeline',
    required: false,
  },
  dealstage: {
    hubspotProperty: 'dealstage',
    required: false,
  },
  closedate: {
    hubspotProperty: 'closedate',
    required: false,
    transformer: transformers.formatDate,
  },
  // Custom properties (configurable via environment variables)
  order_id: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_ORDER_ID', 'order_id'),
    required: false,
    transformer: transformers.toString,
  },
  pickup_address: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_PICKUP_ADDRESS', 'pickup_address'),
    required: false,
  },
  dropoff_address: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DROPOFF_ADDRESS', 'dropoff_address'),
    required: false,
  },
  distance_miles: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DISTANCE_MILES', 'distance_miles'),
    required: false,
    transformer: transformers.roundNumber,
  },
  pipeline_flow: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_PIPELINE_FLOW', 'pipeline_flow'),
    required: false,
    transformer: transformers.toString,
  },
  driver_name: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DRIVER_NAME', 'driver_name'),
    required: false,
  },
  driver_phone: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DRIVER_PHONE', 'driver_phone'),
    required: false,
    transformer: transformers.formatPhone,
  },
};

/**
 * Combined property mappings
 */
export const propertyMappings: PropertyMappings = {
  contact: contactMappings,
  deal: dealMappings,
};

/**
 * Map order sync data to contact properties
 */
export function mapOrderToContactProperties(
  orderData: OrderSyncData
): ContactProperties {
  const properties: ContactProperties = {
    email: orderData.customerEmail,
  };

  // Add optional fields if present
  if (orderData.customerName) {
    const nameParts = orderData.customerName.split(' ');
    properties.firstname = nameParts[0] || '';
    properties.lastname = nameParts.slice(1).join(' ') || '';
  }

  if (orderData.customerPhone) {
    properties.phone = orderData.customerPhone;
  }

  return properties;
}

/**
 * Map order sync data to deal properties
 */
export function mapOrderToDealProperties(
  orderData: OrderSyncData
): DealProperties {
  const properties: DealProperties = {
    dealname: formatDealName(orderData.orderId),
  };

  // Standard HubSpot deal properties
  if (orderData.priceTotal !== undefined) {
    properties.amount = transformers.formatCurrency(orderData.priceTotal);
  }

  // Pipeline and stage (standard HubSpot fields)
  if (process.env.HUBSPOT_PIPELINE_ID) {
    properties.pipeline = process.env.HUBSPOT_PIPELINE_ID;
  }
  
  properties.dealstage = getDealStageForStatus(orderData.status);

  // Close date (default to 30 days from now)
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 30);
  properties.closedate = transformers.formatDate(closeDate);

  // Custom properties (only add if configured)
  const orderIdProp = getPropertyName('HUBSPOT_PROP_ORDER_ID', 'order_id');
  if (orderIdProp) {
    properties[orderIdProp] = orderData.orderId;
  }

  if (orderData.pickupAddress) {
    const pickupProp = getPropertyName('HUBSPOT_PROP_PICKUP_ADDRESS', 'pickup_address');
    if (pickupProp) {
      properties[pickupProp] = orderData.pickupAddress;
    }
  }

  if (orderData.dropoffAddress) {
    const dropoffProp = getPropertyName('HUBSPOT_PROP_DROPOFF_ADDRESS', 'dropoff_address');
    if (dropoffProp) {
      properties[dropoffProp] = orderData.dropoffAddress;
    }
  }

  if (orderData.distanceMiles !== undefined) {
    const distanceProp = getPropertyName('HUBSPOT_PROP_DISTANCE_MILES', 'distance_miles');
    if (distanceProp) {
      properties[distanceProp] = transformers.roundNumber(orderData.distanceMiles);
    }
  }

  // Custom pipeline_flow property (separate from standard dealstage)
  const pipelineFlowProp = getPropertyName('HUBSPOT_PROP_PIPELINE_FLOW', 'pipeline_flow');
  if (pipelineFlowProp) {
    properties[pipelineFlowProp] = orderData.status;
  }

  // Driver information (if assigned)
  if (orderData.driverName) {
    const driverNameProp = getPropertyName('HUBSPOT_PROP_DRIVER_NAME', 'driver_name');
    if (driverNameProp) {
      properties[driverNameProp] = orderData.driverName;
    }
  }

  if (orderData.driverPhone) {
    const driverPhoneProp = getPropertyName('HUBSPOT_PROP_DRIVER_PHONE', 'driver_phone');
    if (driverPhoneProp) {
      properties[driverPhoneProp] = transformers.formatPhone(orderData.driverPhone);
    }
  }

  return properties;
}

/**
 * Apply transformers to property values based on mappings
 */
export function applyTransformers(
  properties: Record<string, any>,
  mappings: Record<string, PropertyMapping>
): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    const mapping = mappings[key];
    
    if (mapping?.transformer && value !== null && value !== undefined) {
      try {
        transformed[key] = mapping.transformer(value);
      } catch (error) {
        console.error(`Failed to transform property '${key}':`, error);
        transformed[key] = value; // Use original value if transform fails
      }
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

/**
 * Get required properties from mappings
 */
export function getRequiredProperties(
  mappings: Record<string, PropertyMapping>
): string[] {
  return Object.entries(mappings)
    .filter(([_, mapping]) => mapping.required)
    .map(([_, mapping]) => mapping.hubspotProperty);
}

/**
 * Validate required properties are present
 */
export function validateRequiredProperties(
  properties: Record<string, any>,
  mappings: Record<string, PropertyMapping>
): { valid: boolean; missing: string[] } {
  const requiredProps = getRequiredProperties(mappings);
  const missing: string[] = [];

  for (const propName of requiredProps) {
    if (properties[propName] === null || properties[propName] === undefined) {
      missing.push(propName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

