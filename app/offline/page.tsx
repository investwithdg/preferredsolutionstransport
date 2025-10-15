'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-lg w-full border-accent/20 bg-accent/5">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">You are offline</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Some features aren&apos;t available without an internet connection. We&apos;ll automatically
            sync your changes once you&apos;re back online.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" asChild>
              <Link href="/">Go to Home</Link>
            </Button>
            <Button onClick={() => location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


