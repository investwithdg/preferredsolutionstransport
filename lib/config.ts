// Environment validation
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }

  // Validate Stripe keys (basic format check)
  const stripeSecret = process.env.STRIPE_SECRET_KEY!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

  if (!stripeSecret.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY must start with "sk_"');
  }

  if (!webhookSecret.startsWith('whsec_')) {
    throw new Error('STRIPE_WEBHOOK_SECRET must start with "whsec_"');
  }

  if (!publishableKey.startsWith('pk_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with "pk_"');
  }
}

// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown, operation: string) {
  console.error(`${operation} failed:`, error);

  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error && error.name === 'ZodError') {
    return {
      error: 'Invalid input data',
      code: 'VALIDATION_ERROR',
      details: error.message,
    };
  }

  return {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
}

// Demo mode helpers
export const isDemoEnabled = (): boolean => process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function requireDemoEnabled(): void {
  if (!isDemoEnabled()) {
    throw new AppError('Demo feature is disabled', 404, 'DEMO_DISABLED');
  }
}

// Pricing configuration for Milestone 1
// TODO: Move to database configuration in later milestones
export const PRICING = {
  baseFee: 50,
  perMileRate: 2,
  fuelPct: 0.10, // 10% fuel surcharge
  currency: 'usd'
} as const;
