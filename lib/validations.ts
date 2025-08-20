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
