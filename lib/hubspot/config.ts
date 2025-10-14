/**
 * HubSpot CRM Configuration
 * Maps order statuses to HubSpot pipeline stages
 * 
 * Note: Custom property mappings have been moved to property-mappings.ts
 * This file now focuses on pipeline and stage configuration.
 * 
 * For property management, see:
 * - lib/hubspot/property-mappings.ts - Property mapping definitions
 * - lib/hubspot/schemas.ts - Property schema fetching and caching
 * - lib/hubspot/validator.ts - Property validation
 */

export const HUBSPOT_CONFIG = {
  // Pipeline ID - Get this from your HubSpot pipeline settings
  // Default pipeline if not specified
  pipelineId: process.env.HUBSPOT_PIPELINE_ID || 'default',
  
  // Deal Stage Mapping - Map order statuses to HubSpot deal stages
  // Update these with your actual stage IDs from HubSpot
  dealStages: {
    // When order is first created (after payment)
    readyForDispatch: process.env.HUBSPOT_STAGE_READY || 'appointmentscheduled',
    
    // When driver is assigned
    assigned: process.env.HUBSPOT_STAGE_ASSIGNED || 'qualifiedtobuy',
    
    // When driver picks up the package
    pickedUp: process.env.HUBSPOT_STAGE_PICKED_UP || 'presentationscheduled',
    
    // When package is delivered
    delivered: process.env.HUBSPOT_STAGE_DELIVERED || 'closedwon',
    
    // If order is canceled
    canceled: process.env.HUBSPOT_STAGE_CANCELED || 'closedlost',
  },

  // Contact properties mapping
  contactProperties: {
    emailField: 'email',
    firstNameField: 'firstname',
    lastNameField: 'lastname',
    phoneField: 'phone',
  },

  // Deal properties configuration
  dealProperties: {
    namePrefix: 'Delivery Order',
    amountField: 'amount',
    pipelineField: 'pipeline',
    dealStageField: 'dealstage',
    closeDateField: 'closedate',
    
    // Custom properties (if you've created them in HubSpot)
    customFields: {
      orderId: process.env.HUBSPOT_CUSTOM_ORDER_ID || undefined,
      pickupAddress: process.env.HUBSPOT_CUSTOM_PICKUP || undefined,
      dropoffAddress: process.env.HUBSPOT_CUSTOM_DROPOFF || undefined,
      distanceMiles: process.env.HUBSPOT_CUSTOM_DISTANCE || undefined,
    },
  },

  // Default close date offset (days from now)
  defaultCloseDateOffsetDays: 30,
};

/**
 * Get HubSpot deal stage for a given order status
 */
export function getDealStageForStatus(orderStatus: string): string {
  const statusMap: Record<string, string> = {
    'ReadyForDispatch': HUBSPOT_CONFIG.dealStages.readyForDispatch,
    'Assigned': HUBSPOT_CONFIG.dealStages.assigned,
    'PickedUp': HUBSPOT_CONFIG.dealStages.pickedUp,
    'Delivered': HUBSPOT_CONFIG.dealStages.delivered,
    'Canceled': HUBSPOT_CONFIG.dealStages.canceled,
  };

  return statusMap[orderStatus] || HUBSPOT_CONFIG.dealStages.readyForDispatch;
}

/**
 * Format deal name from order
 */
export function formatDealName(orderId: string): string {
  return `${HUBSPOT_CONFIG.dealProperties.namePrefix} - ${orderId.slice(0, 8)}`;
}

/**
 * Calculate default close date
 */
export function getDefaultCloseDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + HUBSPOT_CONFIG.defaultCloseDateOffsetDays);
  return date.toISOString();
}
