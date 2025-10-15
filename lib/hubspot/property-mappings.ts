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
  // Core tracking properties
  deal_pipeline: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DEAL_PIPELINE', 'deal_pipeline'),
    required: false,
    transformer: transformers.toString,
  },
  delivery_status: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_STATUS', 'delivery_status'),
    required: false,
    transformer: transformers.toString,
  },
  // Time properties
  actual_delivery_time: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_ACTUAL_DELIVERY_TIME', 'actual_delivery_time'),
    required: false,
    transformer: transformers.formatDate,
  },
  actual_pickup_time: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_ACTUAL_PICKUP_TIME', 'actual_pickup_time'),
    required: false,
    transformer: transformers.formatDate,
  },
  scheduled_delivery_time: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_SCHEDULED_DELIVERY_TIME', 'scheduled_delivery_time'),
    required: false,
    transformer: transformers.formatDate,
  },
  scheduled_pickup_time: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_SCHEDULED_PICKUP_TIME', 'scheduled_pickup_time'),
    required: false,
    transformer: transformers.formatDate,
  },
  // Driver/Vehicle properties
  assigned_driver: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_ASSIGNED_DRIVER', 'assigned_driver'),
    required: false,
  },
  vehicle_type: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_VEHICLE_TYPE', 'vehicle_type'),
    required: false,
  },
  // Delivery detail properties
  delivery_location: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_LOCATION', 'delivery_location'),
    required: false,
  },
  delivery_route: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_ROUTE', 'delivery_route'),
    required: false,
  },
  delivery_type: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_TYPE', 'delivery_type'),
    required: false,
  },
  weight_bracket: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_WEIGHT_BRACKET', 'weight_bracket'),
    required: false,
  },
  special_delivery_instructions: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS', 'special_delivery_instructions'),
    required: false,
  },
  // Exception properties
  delivery_exception_notes: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_EXCEPTION_NOTES', 'delivery_exception_notes'),
    required: false,
  },
  delivery_exception_type: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_EXCEPTION_TYPE', 'delivery_exception_type'),
    required: false,
  },
  delivery_resolution_status: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_DELIVERY_RESOLUTION_STATUS', 'delivery_resolution_status'),
    required: false,
  },
  // Quote properties
  quote_sent: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_QUOTE_SENT', 'quote_sent'),
    required: false,
  },
  quote_source: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_QUOTE_SOURCE', 'quote_source'),
    required: false,
  },
  quote_status: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_QUOTE_STATUS', 'quote_status'),
    required: false,
  },
  recurring_frequency: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_RECURRING_FREQUENCY', 'recurring_frequency'),
    required: false,
  },
  rush_requested: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_RUSH_REQUESTED', 'rush_requested'),
    required: false,
  },
  services_proposed: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_SERVICES_PROPOSED', 'services_proposed'),
    required: false,
  },
  snapshot_audit_sent: {
    hubspotProperty: getPropertyName('HUBSPOT_PROP_SNAPSHOT_AUDIT_SENT', 'snapshot_audit_sent'),
    required: false,
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
 * Get Deal Pipeline value for a given order status
 */
export function getDealPipelineForStatus(orderStatus: string): string {
  const statusMap: Record<string, string> = {
    'ReadyForDispatch': 'Paid',
    'Assigned': 'Assigned',
    'PickedUp': 'Assigned',
    'InTransit': 'Assigned',
    'Delivered': 'Delivered',
    'Completed': 'Completed',
    'Canceled': 'Paid', // Keep in Paid stage when canceled
  };

  return statusMap[orderStatus] || 'Paid';
}

/**
 * Get Delivery Status value for a given order status
 */
export function getDeliveryStatusForStatus(orderStatus: string): string {
  const statusMap: Record<string, string> = {
    'ReadyForDispatch': 'pending',
    'Assigned': 'assigned',
    'PickedUp': 'in_transit',
    'InTransit': 'in_transit',
    'Delivered': 'delivered',
    'Completed': 'delivered',
    'Canceled': 'exception',
  };

  return statusMap[orderStatus] || 'pending';
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

  // Core tracking properties
  const dealPipelineProp = getPropertyName('HUBSPOT_PROP_DEAL_PIPELINE', 'deal_pipeline');
  if (dealPipelineProp) {
    properties[dealPipelineProp] = getDealPipelineForStatus(orderData.status);
  }

  const deliveryStatusProp = getPropertyName('HUBSPOT_PROP_DELIVERY_STATUS', 'delivery_status');
  if (deliveryStatusProp) {
    properties[deliveryStatusProp] = getDeliveryStatusForStatus(orderData.status);
  }

  // Time properties
  if (orderData.actualDeliveryTime) {
    const actualDeliveryProp = getPropertyName('HUBSPOT_PROP_ACTUAL_DELIVERY_TIME', 'actual_delivery_time');
    if (actualDeliveryProp) {
      properties[actualDeliveryProp] = transformers.formatDate(orderData.actualDeliveryTime);
    }
  }

  if (orderData.actualPickupTime) {
    const actualPickupProp = getPropertyName('HUBSPOT_PROP_ACTUAL_PICKUP_TIME', 'actual_pickup_time');
    if (actualPickupProp) {
      properties[actualPickupProp] = transformers.formatDate(orderData.actualPickupTime);
    }
  }

  if (orderData.scheduledDeliveryTime) {
    const scheduledDeliveryProp = getPropertyName('HUBSPOT_PROP_SCHEDULED_DELIVERY_TIME', 'scheduled_delivery_time');
    if (scheduledDeliveryProp) {
      properties[scheduledDeliveryProp] = transformers.formatDate(orderData.scheduledDeliveryTime);
    }
  }

  if (orderData.scheduledPickupTime) {
    const scheduledPickupProp = getPropertyName('HUBSPOT_PROP_SCHEDULED_PICKUP_TIME', 'scheduled_pickup_time');
    if (scheduledPickupProp) {
      properties[scheduledPickupProp] = transformers.formatDate(orderData.scheduledPickupTime);
    }
  }

  // Driver/Vehicle properties
  if (orderData.driverName) {
    // Use assigned_driver for the new field
    const assignedDriverProp = getPropertyName('HUBSPOT_PROP_ASSIGNED_DRIVER', 'assigned_driver');
    if (assignedDriverProp) {
      properties[assignedDriverProp] = orderData.driverName;
    }

    // Also keep driver_name for backward compatibility
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

  if (orderData.vehicleType) {
    const vehicleTypeProp = getPropertyName('HUBSPOT_PROP_VEHICLE_TYPE', 'vehicle_type');
    if (vehicleTypeProp) {
      properties[vehicleTypeProp] = orderData.vehicleType;
    }
  }

  // Delivery detail properties
  if (orderData.deliveryLocation || orderData.dropoffAddress) {
    const deliveryLocationProp = getPropertyName('HUBSPOT_PROP_DELIVERY_LOCATION', 'delivery_location');
    if (deliveryLocationProp) {
      properties[deliveryLocationProp] = orderData.deliveryLocation || orderData.dropoffAddress;
    }
  }

  if (orderData.deliveryRoute || (orderData.pickupAddress && orderData.dropoffAddress)) {
    const deliveryRouteProp = getPropertyName('HUBSPOT_PROP_DELIVERY_ROUTE', 'delivery_route');
    if (deliveryRouteProp) {
      properties[deliveryRouteProp] = orderData.deliveryRoute || `${orderData.pickupAddress} → ${orderData.dropoffAddress}`;
    }
  }

  if (orderData.deliveryType) {
    const deliveryTypeProp = getPropertyName('HUBSPOT_PROP_DELIVERY_TYPE', 'delivery_type');
    if (deliveryTypeProp) {
      properties[deliveryTypeProp] = orderData.deliveryType;
    }
  }

  if (orderData.weightBracket) {
    const weightBracketProp = getPropertyName('HUBSPOT_PROP_WEIGHT_BRACKET', 'weight_bracket');
    if (weightBracketProp) {
      properties[weightBracketProp] = orderData.weightBracket;
    }
  }

  if (orderData.specialDeliveryInstructions) {
    const instructionsProp = getPropertyName('HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS', 'special_delivery_instructions');
    if (instructionsProp) {
      properties[instructionsProp] = orderData.specialDeliveryInstructions;
    }
  }

  // Exception properties
  if (orderData.deliveryExceptionNotes) {
    const exceptionNotesProp = getPropertyName('HUBSPOT_PROP_DELIVERY_EXCEPTION_NOTES', 'delivery_exception_notes');
    if (exceptionNotesProp) {
      properties[exceptionNotesProp] = orderData.deliveryExceptionNotes;
    }
  }

  if (orderData.deliveryExceptionType) {
    const exceptionTypeProp = getPropertyName('HUBSPOT_PROP_DELIVERY_EXCEPTION_TYPE', 'delivery_exception_type');
    if (exceptionTypeProp) {
      properties[exceptionTypeProp] = orderData.deliveryExceptionType;
    }
  }

  if (orderData.deliveryResolutionStatus) {
    const resolutionStatusProp = getPropertyName('HUBSPOT_PROP_DELIVERY_RESOLUTION_STATUS', 'delivery_resolution_status');
    if (resolutionStatusProp) {
      properties[resolutionStatusProp] = orderData.deliveryResolutionStatus;
    }
  }

  // Quote properties
  if (orderData.quoteSent !== undefined) {
    const quoteSentProp = getPropertyName('HUBSPOT_PROP_QUOTE_SENT', 'quote_sent');
    if (quoteSentProp) {
      properties[quoteSentProp] = orderData.quoteSent ? 'true' : 'false';
    }
  }

  if (orderData.quoteSource) {
    const quoteSourceProp = getPropertyName('HUBSPOT_PROP_QUOTE_SOURCE', 'quote_source');
    if (quoteSourceProp) {
      properties[quoteSourceProp] = orderData.quoteSource;
    }
  }

  if (orderData.quoteStatus) {
    const quoteStatusProp = getPropertyName('HUBSPOT_PROP_QUOTE_STATUS', 'quote_status');
    if (quoteStatusProp) {
      properties[quoteStatusProp] = orderData.quoteStatus;
    }
  }

  if (orderData.recurringFrequency) {
    const recurringFreqProp = getPropertyName('HUBSPOT_PROP_RECURRING_FREQUENCY', 'recurring_frequency');
    if (recurringFreqProp) {
      properties[recurringFreqProp] = orderData.recurringFrequency;
    }
  }

  if (orderData.rushRequested !== undefined) {
    const rushRequestedProp = getPropertyName('HUBSPOT_PROP_RUSH_REQUESTED', 'rush_requested');
    if (rushRequestedProp) {
      properties[rushRequestedProp] = orderData.rushRequested ? 'true' : 'false';
    }
  }

  if (orderData.servicesProposed) {
    const servicesProp = getPropertyName('HUBSPOT_PROP_SERVICES_PROPOSED', 'services_proposed');
    if (servicesProp) {
      properties[servicesProp] = orderData.servicesProposed;
    }
  }

  if (orderData.snapshotAuditSent) {
    const auditSentProp = getPropertyName('HUBSPOT_PROP_SNAPSHOT_AUDIT_SENT', 'snapshot_audit_sent');
    if (auditSentProp) {
      properties[auditSentProp] = orderData.snapshotAuditSent;
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

