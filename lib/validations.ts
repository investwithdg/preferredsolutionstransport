import { z } from 'zod';

// Quote request validation
export const quoteRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  pickupAddress: z.string().min(1, 'Pickup address is required').max(500),
  dropoffAddress: z.string().min(1, 'Dropoff address is required').max(500),
  distanceMi: z.number().positive('Distance must be positive'),
  weightLb: z.number().positive().optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

// Checkout request validation
export const checkoutRequestSchema = z.object({
  quoteId: z.string().uuid('Invalid quote ID'),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

// Orders: by-driver
export const byDriverSchema = z.object({
  driverId: z.string().uuid('Invalid driver ID'),
});
export type ByDriverRequest = z.infer<typeof byDriverSchema>;

// Orders: status update
export const updateOrderStatusSchema = z.object({
  status: z.enum(['Accepted', 'PickedUp', 'InTransit', 'Delivered', 'Canceled']),
  notes: z.string().optional(),
});
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>;

// Orders: assign driver
export const assignDriverSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  driverId: z.string().uuid('Invalid driver ID'),
});
export type AssignDriverRequest = z.infer<typeof assignDriverSchema>;

// Drivers: location update
export const driverLocationUpdateSchema = z.object({
  driverId: z.string().uuid('Invalid driver ID'),
  orderId: z.string().uuid('Invalid order ID').optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().optional(),
});
export type DriverLocationUpdateRequest = z.infer<typeof driverLocationUpdateSchema>;

// Drivers: push subscription
export const driverPushSubscriptionSchema = z.object({
  driverId: z.string(), // Allow any string, not just UUID, for demo mode compatibility
  subscription: z.object({
    endpoint: z.string().url('Invalid endpoint URL'),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }).nullable(),
});
export type DriverPushSubscriptionRequest = z.infer<typeof driverPushSubscriptionSchema>;
