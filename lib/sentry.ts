// Sentry telemetry configuration
// This file provides minimal error tracking and performance monitoring
// Only loads if SENTRY_DSN environment variable is set

// Optional import - Sentry is an optionalDependency
 
let Sentry: any = null;

// Lazy load Sentry only if installed
try {
  Sentry = require('@sentry/nextjs');
} catch {
  // Sentry not installed, no-op - silence is intentional
}
 

let isInitialized = false;

export function initSentry() {
  if (isInitialized || typeof window === 'undefined' || !Sentry) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return; // Sentry DSN not configured
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      // Add performance monitoring
      // Add more integrations as needed
    ],
    beforeSend(event: any) {
      // Filter out development errors and sensitive data
      if (process.env.NODE_ENV === 'development') {
        return null;
      }

      // Remove sensitive environment variables from events
      if (event.extra) {
        delete event.extra['process.env'];
      }

      return event;
    },
  });

  isInitialized = true;
}

// Error capture helpers
export function captureApiError(error: unknown, context: string, extra?: Record<string, any>) {
  if (!isInitialized || !Sentry) return;

  const errorData = {
    contexts: {
      api: {
        context,
        ...extra,
      },
    },
    tags: {
      source: 'api',
      context,
    },
  };

  if (error instanceof Error) {
    Sentry.captureException(error, errorData);
  } else {
    Sentry.captureMessage(`API Error in ${context}: ${String(error)}`, errorData as any);
  }
}

export function captureWebhookError(error: unknown, eventType: string, eventId?: string) {
  if (!isInitialized || !Sentry) return;

  const errorData = {
    contexts: {
      webhook: {
        event_type: eventType,
        event_id: eventId,
      },
    },
    tags: {
      source: 'webhook',
      event_type: eventType,
    },
  };

  if (error instanceof Error) {
    Sentry.captureException(error, errorData);
  } else {
    Sentry.captureMessage(`Webhook Error for ${eventType}: ${String(error)}`, errorData as any);
  }
}

// User context helpers
export function setSentryUser(userId: string, email?: string) {
  if (!isInitialized || !Sentry) return;

  Sentry.setUser({
    id: userId,
    email,
  });
}

export function setSentryTag(key: string, value: string) {
  if (!isInitialized || !Sentry) return;

  Sentry.setTag(key, value);
}

// Feature flag helpers (for future use)
export function getFeatureFlag(flagName: string, defaultValue: boolean = false): boolean {
  // TODO: Implement feature flag service (LaunchDarkly, etc.)
  // For now, use environment variables
  const envValue = process.env[`FEATURE_${flagName.toUpperCase()}`];
  return envValue ? envValue === 'true' : defaultValue;
}

// Performance monitoring helpers
export function startSentryTransaction(_name: string, _operation: string) {
  if (!isInitialized) return null;

  // TODO: Use Sentry.startTransaction when available
  return null;
}

export function finishSentryTransaction(_transaction: any) {
  if (!isInitialized || !_transaction) return;

  // TODO: Use transaction.finish() when available
}
