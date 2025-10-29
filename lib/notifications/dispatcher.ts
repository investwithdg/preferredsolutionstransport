import { createHubSpotClient, sendHubSpotEmail } from '@/lib/hubspot/client';
import { driverAssignmentNotificationEmail, statusUpdateEmail } from '@/lib/hubspot/emails';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isTwilioConfigured, sendSms } from './providers/twilio';

/**
 * Dispatcher Notification Service
 * 
 * Placeholder/stub functions for sending notifications to drivers and customers.
 * These functions currently only log to console. 
 * 
 * TODO (Later Implementation):
 * - Integrate with email service (SendGrid, AWS SES, etc.)
 * - Integrate with SMS service (Twilio, AWS SNS, etc.)
 * - Add notification templates
 * - Add notification preferences/opt-out handling
 */

interface DriverAssignmentParams {
  driverId: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance?: number;
  scheduledPickupTime?: string;
  priceTotal?: number;
  currency?: string;
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
}

interface OrderStatusChangeParams {
  orderId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  distance?: number;
  priceTotal?: number;
  currency?: string;
  newStatus: string;
  previousStatus?: string;
  driverName?: string;
  driverPhone?: string;
  estimatedDeliveryTime?: string;
}

interface DispatcherAlertParams {
  type: 'driver_assigned' | 'order_delayed' | 'order_exception' | 'driver_unavailable';
  orderId: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

const STATUS_LABELS: Record<string, string> = {
  ReadyForDispatch: 'Ready for dispatch',
  Assigned: 'Driver assigned',
  Accepted: 'Accepted by driver',
  PickedUp: 'Picked up',
  InTransit: 'In transit',
  Delivered: 'Delivered',
  Canceled: 'Cancelled',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function resolveDriverContact(driverId: string): Promise<{ email?: string; phone?: string }> {
  try {
    const supabase = createServiceRoleClient();
    const { data: driverRecord } = await supabase
      .from('drivers')
      .select('user_id, phone')
      .eq('id', driverId)
      .single();

    const result: { email?: string; phone?: string } = {};

    if (driverRecord?.phone) {
      result.phone = driverRecord.phone;
    }

    if (driverRecord?.user_id) {
      const { data: userDetails } = await supabase.auth.admin.getUserById(driverRecord.user_id);
      if (userDetails?.user?.email) {
        result.email = userDetails.user.email;
      }
    }

    return result;
  } catch (error) {
    console.error('[Notifications] Failed to resolve driver contact info:', error);
    return {};
  }
}

function normalizePhoneNumber(phone?: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/\s+/g, '');
  }
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+${digits}`;
}

/**
 * Notify driver when they are assigned to an order
 * 
 * @param params - Driver assignment notification parameters
 */
export async function notifyDriverAssignment(params: DriverAssignmentParams): Promise<void> {
  const hubspotClient = createHubSpotClient();

  let driverEmail = params.driverEmail;
  let driverPhone = params.driverPhone;

  if ((!driverEmail || !driverPhone) && params.driverId) {
    const resolved = await resolveDriverContact(params.driverId);
    driverEmail = driverEmail || resolved.email;
    driverPhone = driverPhone || resolved.phone;
  }

  const orderSummary = {
    orderId: params.orderId,
    customerName: params.customerName,
    customerEmail: params.customerEmail || 'support@preferredsolutions.com',
    customerPhone: params.customerPhone,
    pickupAddress: params.pickupAddress,
    dropoffAddress: params.dropoffAddress,
    distance: params.distance || 0,
    priceTotal: params.priceTotal || 0,
    currency: (params.currency || 'usd').toLowerCase(),
    trackingUrl: `${APP_URL}/driver`,
    createdAt: new Date(),
  };

  if (hubspotClient && driverEmail) {
    try {
      const driverTemplate = driverAssignmentNotificationEmail(orderSummary, {
        name: params.driverName || 'Driver',
        phone: driverPhone || '',
      });

      await sendHubSpotEmail(hubspotClient, {
        to: driverEmail,
        subject: driverTemplate.subject,
        htmlContent: driverTemplate.html,
      });
    } catch (error) {
      console.error('[Notifications] Failed to send driver assignment email:', error);
    }
  } else {
    console.warn('[Notifications] Driver email not available; assignment email skipped.');
  }

  const normalizedPhone = normalizePhoneNumber(driverPhone);
  if (normalizedPhone && isTwilioConfigured()) {
    const smsBody = `New delivery assigned: ${params.pickupAddress} → ${params.dropoffAddress}. Order #${params.orderId.slice(-8)}.`;
    const smsSent = await sendSms(normalizedPhone, smsBody);
    if (!smsSent) {
      console.warn('[Notifications] Driver assignment SMS failed to send.');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Driver Assignment Notification Dispatched');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Driver ID:', params.driverId);
  console.log('Driver Name:', params.driverName || 'N/A');
  console.log('Driver Email:', driverEmail || 'N/A');
  console.log('Driver Phone:', driverPhone || 'N/A');
  console.log('Order ID:', params.orderId);
  console.log('Customer:', params.customerName);
  console.log('Pickup:', params.pickupAddress);
  console.log('Dropoff:', params.dropoffAddress);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

/**
 * Notify customer when order status changes
 * 
 * @param params - Order status change notification parameters
 */
export async function notifyOrderStatusChange(params: OrderStatusChangeParams): Promise<void> {
  const statusDisplay =
    STATUS_LABELS[params.newStatus] ||
    params.newStatus.replace(/([A-Z])/g, ' $1').trim();
  const hubspotClient = createHubSpotClient();

  if (hubspotClient && params.customerEmail) {
    try {
      const orderSummary = {
        orderId: params.orderId,
        customerName: params.customerName || 'Customer',
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        pickupAddress: params.pickupAddress || 'N/A',
        dropoffAddress: params.dropoffAddress || 'N/A',
        distance: params.distance || 0,
        priceTotal: params.priceTotal || 0,
        currency: (params.currency || 'usd').toLowerCase(),
        trackingUrl: `${APP_URL}/track/${params.orderId}`,
        createdAt: new Date(),
      };

      const statusTemplate = statusUpdateEmail(
        orderSummary,
        {
          status: params.newStatus,
          statusDisplay,
          timestamp: new Date(),
        },
        params.driverName
          ? {
              name: params.driverName,
              phone: params.driverPhone || '',
            }
          : undefined
      );

      await sendHubSpotEmail(hubspotClient, {
        to: params.customerEmail,
        subject: statusTemplate.subject,
        htmlContent: statusTemplate.html,
      });
    } catch (error) {
      console.error('[Notifications] Failed to send status update email:', error);
    }
  }

  const normalizedPhone = normalizePhoneNumber(params.customerPhone);
  if (normalizedPhone && isTwilioConfigured()) {
    const smsBody = `Order #${params.orderId.slice(-8)} update: ${statusDisplay}.`;
    const smsSent = await sendSms(normalizedPhone, smsBody);
    if (!smsSent) {
      console.warn('[Notifications] Order status SMS failed to send.');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Order Status Notification Dispatched');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Order ID:', params.orderId);
  console.log('Customer ID:', params.customerId);
  console.log('Customer Email:', params.customerEmail || 'N/A');
  console.log('Customer Phone:', params.customerPhone || 'N/A');
  console.log('Previous Status:', params.previousStatus || 'N/A');
  console.log('New Status:', params.newStatus);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

/**
 * Send alert to dispatcher team
 * 
 * @param params - Dispatcher alert parameters
 */
export async function sendDispatcherAlert(params: DispatcherAlertParams): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚨 [Notification Stub] Dispatcher Alert - ${params.severity.toUpperCase()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Alert Type:', params.type);
  console.log('Order ID:', params.orderId);
  console.log('Message:', params.message);
  if (params.metadata) {
    console.log('Metadata:', JSON.stringify(params.metadata, null, 2));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // TODO: Implement actual notification to dispatcher team
  // Could use:
  // - Email to dispatcher group
  // - Slack webhook
  // - SMS to on-call dispatcher
  // - In-app notification
}

/**
 * Notify driver about order update or change
 * 
 * @param params - Driver notification parameters
 */
export async function notifyDriverUpdate(params: {
  driverId: string;
  orderId: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
}): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📱 [Notification Stub] Driver Update - ${params.urgency.toUpperCase()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Driver ID:', params.driverId);
  console.log('Order ID:', params.orderId);
  console.log('Message:', params.message);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // TODO: Implement push notification or SMS to driver
}

/**
 * Batch notification for multiple drivers (e.g., new orders available)
 * 
 * @param driverIds - Array of driver IDs to notify
 * @param message - Message to send
 */
export async function notifyMultipleDrivers(
  driverIds: string[],
  message: string
): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📢 [Notification Stub] Batch Driver Notification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recipients:', driverIds.length, 'drivers');
  console.log('Driver IDs:', driverIds.join(', '));
  console.log('Message:', message);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // TODO: Implement batch notification
  // Should handle rate limiting and delivery confirmation
}
