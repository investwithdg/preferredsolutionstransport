// Sentry telemetry configuration
// This file provides minimal error tracking and performance monitoring
// Only loads if SENTRY_DSN environment variable is set

import { init, captureException, captureMessage, setTag, setUser } from '@sentry/nextjs';

let isInitialized = false;

export function initSentry() {
  if (isInitialized || typeof window === 'undefined') return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.log('Sentry DSN not found, skipping initialization');
    return;
  }

  init({
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
    beforeSend(event) {
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
  console.log('Sentry initialized');
}

// Error capture helpers
export function captureApiError(error: unknown, context: string, extra?: Record<string, any>) {
  if (!isInitialized) return;

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
    captureException(error, errorData);
  } else {
    captureMessage(`API Error in ${context}: ${String(error)}`, 'error', errorData);
  }
}

export function captureWebhookError(error: unknown, eventType: string, eventId?: string) {
  if (!isInitialized) return;

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
    captureException(error, errorData);
  } else {
    captureMessage(`Webhook Error for ${eventType}: ${String(error)}`, 'error', errorData);
  }
}

// User context helpers
export function setSentryUser(userId: string, email?: string) {
  if (!isInitialized) return;

  setUser({
    id: userId,
    email,
  });
}

export function setSentryTag(key: string, value: string) {
  if (!isInitialized) return;

  setTag(key, value);
}

// Feature flag helpers (for future use)
export function getFeatureFlag(flagName: string, defaultValue: boolean = false): boolean {
  // TODO: Implement feature flag service (LaunchDarkly, etc.)
  // For now, use environment variables
  const envValue = process.env[`FEATURE_${flagName.toUpperCase()}`];
  return envValue ? envValue === 'true' : defaultValue;
}

// Performance monitoring helpers
export function startSentryTransaction(name: string, operation: string) {
  if (!isInitialized) return null;

  // TODO: Use Sentry.startTransaction when available
  console.log(`Transaction started: ${name} (${operation})`);
  return null;
}

export function finishSentryTransaction(transaction: any) {
  if (!isInitialized || !transaction) return;

  // TODO: Use transaction.finish() when available
  console.log('Transaction finished');
}