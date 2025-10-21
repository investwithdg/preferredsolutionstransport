/**
 * HubSpot Webhook Utilities
 * Handles webhook signature verification and payload parsing
 */

import crypto from 'crypto';

/**
 * HubSpot webhook event types
 */
export type WebhookEventType = 
  | 'contact.propertyChange'
  | 'deal.propertyChange'
  | 'contact.creation'
  | 'deal.creation'
  | 'contact.deletion'
  | 'deal.deletion';

/**
 * Property change detail from webhook
 */
export interface PropertyChange {
  name: string;
  value: any;
  previousValue?: any;
}

/**
 * Parsed webhook event
 */
export interface WebhookEvent {
  eventId: string;
  eventType: WebhookEventType;
  objectType: 'contact' | 'deal';
  objectId: string;
  portalId: number;
  occurredAt: number;
  propertyChanges?: PropertyChange[];
  rawPayload: any;
}

/**
 * Verify HubSpot webhook signature
 * HubSpot uses SHA-256 HMAC with the app secret
 * 
 * @param payload - Raw request body string
 * @param signature - X-HubSpot-Signature header value
 * @param clientSecret - HubSpot app client secret
 * @returns true if signature is valid
 */
export function verifyHubSpotSignature(
  payload: string,
  signature: string,
  clientSecret: string
): boolean {
  if (!signature || !clientSecret) {
    return false;
  }

  try {
    // HubSpot uses method + url + body, but for v3 webhooks it's just the body
    const hash = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    );
  } catch (error) {
    console.error('Error verifying HubSpot signature:', error);
    return false;
  }
}

/**
 * Parse HubSpot webhook payload
 * Extracts relevant information from the webhook event
 */
export function parseWebhookPayload(body: any): WebhookEvent | null {
  try {
    // HubSpot v3 webhook format
    const eventId = body.eventId || body.id;
    const subscriptionType = body.subscriptionType;
    const objectId = body.objectId?.toString();
    const portalId = body.portalId;
    const occurredAt = body.occurredAt || Date.now();

    if (!eventId || !subscriptionType || !objectId) {
      console.error('Missing required webhook fields', { eventId, subscriptionType, objectId });
      return null;
    }

    // Determine event type and object type
    let eventType: WebhookEventType;
    let objectType: 'contact' | 'deal';

    if (subscriptionType.includes('contact')) {
      objectType = 'contact';
      if (subscriptionType.includes('propertyChange')) {
        eventType = 'contact.propertyChange';
      } else if (subscriptionType.includes('creation')) {
        eventType = 'contact.creation';
      } else if (subscriptionType.includes('deletion')) {
        eventType = 'contact.deletion';
      } else {
        eventType = 'contact.propertyChange'; // default
      }
    } else if (subscriptionType.includes('deal')) {
      objectType = 'deal';
      if (subscriptionType.includes('propertyChange')) {
        eventType = 'deal.propertyChange';
      } else if (subscriptionType.includes('creation')) {
        eventType = 'deal.creation';
      } else if (subscriptionType.includes('deletion')) {
        eventType = 'deal.deletion';
      } else {
        eventType = 'deal.propertyChange'; // default
      }
    } else {
      console.error('Unknown subscription type:', subscriptionType);
      return null;
    }

    // Extract property changes
    let propertyChanges: PropertyChange[] | undefined;
    if (body.propertyName && body.propertyValue !== undefined) {
      // Single property change format
      propertyChanges = [{
        name: body.propertyName,
        value: body.propertyValue,
        previousValue: body.previousPropertyValue,
      }];
    } else if (body.properties) {
      // Multiple properties format
      propertyChanges = Object.entries(body.properties).map(([name, data]: [string, any]) => ({
        name,
        value: data.value,
        previousValue: data.previousValue,
      }));
    }

    return {
      eventId,
      eventType,
      objectType,
      objectId,
      portalId,
      occurredAt,
      propertyChanges,
      rawPayload: body,
    };
  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    return null;
  }
}

/**
 * Check if webhook event is a property change event
 */
export function isPropertyChangeEvent(event: WebhookEvent): boolean {
  return event.eventType === 'contact.propertyChange' || 
         event.eventType === 'deal.propertyChange';
}

/**
 * Get changed property names from event
 */
export function getChangedProperties(event: WebhookEvent): string[] {
  if (!event.propertyChanges) {
    return [];
  }
  return event.propertyChanges.map(change => change.name);
}

/**
 * Get property value from event
 */
export function getPropertyValue(event: WebhookEvent, propertyName: string): any {
  if (!event.propertyChanges) {
    return undefined;
  }
  const change = event.propertyChanges.find(c => c.name === propertyName);
  return change?.value;
}



