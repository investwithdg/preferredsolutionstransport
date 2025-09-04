import { PricingResult } from '@/lib/pricing';

// API Response Types
export interface QuoteResponse {
  quoteId: string;
  pricing: PricingResult;
}

export interface CheckoutResponse {
  url: string;
}

export interface WebhookResponse {
  received: true;
  dedup?: boolean;
  logged?: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: string | Record<string, any>;
  code?: string;
}

// API Request Types
export interface QuoteRequestBody {
  name: string;
  email: string;
  phone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceMi: number;
  weightLb?: number;
}

export interface CheckoutRequestBody {
  quoteId: string;
}

// Order Status Update Types
export interface OrderStatusUpdateRequest {
  status: string;
  notes?: string;
}

export interface OrderAssignmentRequest {
  driverId: string;
  dispatcherNotes?: string;
}

// Driver Types
export interface DriverListResponse {
  drivers: Array<{
    id: string;
    name: string;
    phone?: string;
    vehicleDetails?: any;
    isAvailable?: boolean;
  }>;
}

// Order Types
export interface OrderListResponse {
  orders: Array<{
    id: string;
    status: string;
    priceTotal: number;
    currency: string;
    customer: {
      name?: string;
      email: string;
      phone?: string;
    };
    quote: {
      pickupAddress: string;
      dropoffAddress: string;
      distanceMi: number;
    };
    driver?: {
      name: string;
      phone?: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  totalCount: number;
}

// Success Response wrapper
export type ApiResponse<T> = T | ErrorResponse;

// Helper type guards
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

export function isSuccessResponse<T>(response: ApiResponse<T>): response is T {
  return !isErrorResponse(response);
}