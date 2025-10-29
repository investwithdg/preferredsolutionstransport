/**
 * Email templates for customer notifications
 * Using HubSpot Transactional Email API
 */

type OrderData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number;
  priceTotal: number;
  currency: string;
  trackingUrl: string;
  createdAt: Date;
};

type DriverData = {
  name: string;
  phone: string;
  vehicleDetails?: string;
};

type StatusData = {
  status: string;
  statusDisplay: string;
  timestamp: Date;
};

const BRAND_COLOR = '#3b82f6'; // accent color from design system
const BRAND_NAME = 'Preferred Solutions Transport';
const SUPPORT_EMAIL = 'support@preferredsolutions.com';

/**
 * Base email template with consistent styling
 */
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, ${BRAND_COLOR} 0%, #2563eb 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .info-box {
      background-color: #f9fafb;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #1f2937;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #1f2937;
      font-weight: 500;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: ${BRAND_COLOR};
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 500;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: ${BRAND_COLOR};
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        border-radius: 0;
      }
      .content {
        padding: 24px 16px;
      }
      .info-row {
        flex-direction: column;
      }
      .info-value {
        margin-top: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Order confirmation email after successful payment
 */
export function orderConfirmationEmail(order: OrderData): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi ${order.customerName},</p>
      <p>Thank you for choosing ${BRAND_NAME}! Your order has been confirmed and will be assigned to a driver shortly.</p>
      
      <div class="info-box">
        <h3>Order Details</h3>
        <div class="info-row">
          <span class="info-label">Order ID</span>
          <span class="info-value">#${order.orderId.slice(0, 8)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Amount</span>
          <span class="info-value">$${order.priceTotal.toFixed(2)} ${order.currency.toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Distance</span>
          <span class="info-value">${order.distance} miles</span>
        </div>
      </div>

      <div class="info-box">
        <h3>Delivery Route</h3>
        <div class="info-row">
          <span class="info-label">📍 Pickup</span>
          <span class="info-value">${order.pickupAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📍 Dropoff</span>
          <span class="info-value">${order.dropoffAddress}</span>
        </div>
      </div>

      <center>
        <a href="${order.trackingUrl}" class="button">Track Your Order</a>
      </center>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        You'll receive another email once a driver has been assigned to your order.
      </p>
    </div>
  `;

  return {
    subject: `Order Confirmation - Order #${order.orderId.slice(0, 8)}`,
    html: baseTemplate(content),
  };
}

/**
 * Driver assignment notification
 */
export function driverAssignedEmail(order: OrderData, driver: DriverData): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>🚛 Driver Assigned!</h1>
    </div>
    <div class="content">
      <p>Hi ${order.customerName},</p>
      <p>Great news! Your order has been assigned to a driver and will be picked up soon.</p>
      
      <div class="info-box">
        <h3>Driver Information</h3>
        <div class="info-row">
          <span class="info-label">Driver Name</span>
          <span class="info-value">${driver.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone</span>
          <span class="info-value"><a href="tel:${driver.phone}">${driver.phone}</a></span>
        </div>
        ${driver.vehicleDetails ? `
        <div class="info-row">
          <span class="info-label">Vehicle</span>
          <span class="info-value">${driver.vehicleDetails}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-box">
        <h3>Order #${order.orderId.slice(0, 8)}</h3>
        <div class="info-row">
          <span class="info-label">From</span>
          <span class="info-value">${order.pickupAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">To</span>
          <span class="info-value">${order.dropoffAddress}</span>
        </div>
      </div>

      <center>
        <a href="${order.trackingUrl}" class="button">Track Your Delivery</a>
      </center>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        You can contact your driver directly using the phone number above if needed.
      </p>
    </div>
  `;

  return {
    subject: `Driver Assigned - Order #${order.orderId.slice(0, 8)}`,
    html: baseTemplate(content),
  };
}

/**
 * Driver-facing notification for new assignments
 */
export function driverAssignmentNotificationEmail(order: OrderData, driver: DriverData): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>🚚 New Delivery Assigned</h1>
    </div>
    <div class="content">
      <p>Hi ${driver.name || 'there'},</p>
      <p>You have a new delivery assignment. Review the details below and update the status in your driver dashboard when you&apos;re on the way.</p>
      
      <div class="info-box">
        <h3>Order Overview</h3>
        <div class="info-row">
          <span class="info-label">Order ID</span>
          <span class="info-value">#${order.orderId.slice(0, 8)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Pickup</span>
          <span class="info-value">${order.pickupAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dropoff</span>
          <span class="info-value">${order.dropoffAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Distance</span>
          <span class="info-value">${order.distance} miles</span>
        </div>
      </div>

      <div class="info-box">
        <h3>Customer Contact</h3>
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">${order.customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value"><a href="mailto:${order.customerEmail}">${order.customerEmail}</a></span>
        </div>
        ${order.customerPhone ? `
        <div class="info-row">
          <span class="info-label">Phone</span>
          <span class="info-value"><a href="tel:${order.customerPhone}">${order.customerPhone}</a></span>
        </div>
        ` : ''}
      </div>

      <center>
        <a href="${order.trackingUrl}" class="button">Open Driver Dashboard</a>
      </center>

      <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
        Please let dispatch know immediately if you cannot complete this delivery.
      </p>
    </div>
  `;

  return {
    subject: `New Delivery Assignment - Order #${order.orderId.slice(0, 8)}`,
    html: baseTemplate(content),
  };
}

/**
 * Order status update email
 */
export function statusUpdateEmail(
  order: OrderData,
  statusData: StatusData,
  driver?: DriverData
): { subject: string; html: string } {
  const statusIcons: Record<string, string> = {
    PickedUp: '📦',
    InTransit: '🚛',
    Delivered: '✅',
  };

  const statusMessages: Record<string, string> = {
    PickedUp: 'Your package has been picked up and is being prepared for delivery.',
    InTransit: 'Your package is on its way to the destination!',
    Delivered: 'Your package has been successfully delivered!',
  };

  const icon = statusIcons[statusData.status] || '📋';
  const message = statusMessages[statusData.status] || `Order status updated to ${statusData.statusDisplay}.`;

  const content = `
    <div class="header">
      <h1>${icon} ${statusData.statusDisplay}</h1>
    </div>
    <div class="content">
      <p>Hi ${order.customerName},</p>
      <p>${message}</p>
      
      <div class="info-box">
        <h3>Order #${order.orderId.slice(0, 8)}</h3>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value">${statusData.statusDisplay}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Updated At</span>
          <span class="info-value">${statusData.timestamp.toLocaleString('en-US', { 
            dateStyle: 'medium',
            timeStyle: 'short'
          })}</span>
        </div>
        ${driver ? `
        <div class="info-row">
          <span class="info-label">Driver</span>
          <span class="info-value">${driver.name}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-box">
        <h3>Delivery Details</h3>
        <div class="info-row">
          <span class="info-label">From</span>
          <span class="info-value">${order.pickupAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">To</span>
          <span class="info-value">${order.dropoffAddress}</span>
        </div>
      </div>

      <center>
        <a href="${order.trackingUrl}" class="button">Track Your Order</a>
      </center>

      ${statusData.status === 'Delivered' ? `
        <p style="margin-top: 24px; padding: 16px; background-color: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
          <strong>Thank you for choosing ${BRAND_NAME}!</strong><br>
          We hope you're satisfied with our service. If you have any feedback, please don't hesitate to reach out.
        </p>
      ` : ''}
    </div>
  `;

  return {
    subject: `${statusData.statusDisplay} - Order #${order.orderId.slice(0, 8)}`,
    html: baseTemplate(content),
  };
}

/**
 * Format status for display
 */
export function formatStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'ReadyForDispatch': 'Ready for Dispatch',
    'Assigned': 'Driver Assigned',
    'Accepted': 'Order Accepted',
    'PickedUp': 'Picked Up',
    'InTransit': 'In Transit',
    'Delivered': 'Delivered',
    'Canceled': 'Canceled',
  };

  return statusMap[status] || status;
}
