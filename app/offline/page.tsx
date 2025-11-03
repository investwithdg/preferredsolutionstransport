'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function OfflineContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const isConfigError = error === 'config';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card
        className={`max-w-lg w-full ${isConfigError ? 'border-destructive/20 bg-destructive/5' : 'border-accent/20 bg-accent/5'}`}
      >
        <CardContent className="p-8 text-center">
          <div
            className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${isConfigError ? 'bg-destructive/10' : 'bg-accent/10'}`}
          >
            {isConfigError ? (
              <AlertCircle className="h-8 w-8 text-destructive" />
            ) : (
              <WifiOff className="h-8 w-8 text-accent" />
            )}
          </div>

          {isConfigError ? (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-2">Configuration Error</h1>
              <p className="text-sm text-muted-foreground mb-6">
                The application is not properly configured. Required environment variables are
                missing. Please check your deployment settings in Vercel.
              </p>
              <div className="bg-background rounded p-4 mb-6 text-left">
                <p className="text-xs font-semibold mb-2">Required Variables:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• NEXT_PUBLIC_SUPABASE_URL</li>
                  <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  <li>• SUPABASE_SERVICE_ROLE_KEY</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-2">You are offline</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Some features aren&apos;t available without an internet connection. We&apos;ll
                automatically sync your changes once you&apos;re back online.
              </p>
            </>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" asChild>
              <Link href="/">Go to Home</Link>
            </Button>
            <Button onClick={() => location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>

          {isConfigError && (
            <div className="mt-4">
              <Button variant="link" asChild>
                <a
                  href="/api/health/config"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs"
                >
                  View Configuration Status
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OfflinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <OfflineContent />
    </Suspense>
  );
}
