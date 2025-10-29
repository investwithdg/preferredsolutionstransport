'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { PackageSearch, Mail, ArrowRight, Loader2, Shield } from 'lucide-react';

export default function TrackLandingPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normaliseOrderId = (value: string) => value.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const formattedOrderId = normaliseOrderId(orderId);

    if (!formattedOrderId) {
      toast.error('Enter your order ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/track/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: formattedOrderId,
          email: email.trim() || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('We could not find that order', {
            description: 'Double-check the order ID from your confirmation email.',
          });
        } else if (response.status === 403) {
          toast.error('Email does not match our records', {
            description: 'Use the same email that received the confirmation message.',
          });
        } else {
          toast.error('Unable to verify order', {
            description: 'Please try again or contact support for assistance.',
          });
        }
        return;
      }

      router.push(`/track/${formattedOrderId}`);
    } catch (error) {
      console.error('[Track Landing] Error verifying order', error);
      toast.error('Unable to verify order', {
        description: 'Check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container max-w-[900px] mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-3xl shadow-soft-lg p-8 md:p-12 border border-border">
          <PageHeader
            title="Track your delivery"
            description="Enter your order ID to see live driver location, proof of delivery, and real-time updates."
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Track Order' },
            ]}
          />

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageSearch className="h-5 w-5 text-accent" />
                  Find your order
                </CardTitle>
                <CardDescription>
                  You can find the order ID in your confirmation email or customer dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="order-id">Order ID</Label>
                    <Input
                      id="order-id"
                      value={orderId}
                      onChange={(event) => setOrderId(event.target.value)}
                      placeholder="e.g. 3c5d6f1a-..."
                      required
                      autoComplete="off"
                      className="font-mono tracking-tight text-sm"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the full Order ID from your confirmation email. It starts with letters and numbers, e.g. <code className="font-mono text-[11px]">3c5d6f1a-...</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="pl-10"
                        autoComplete="email"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adding your email helps us verify that you&apos;re the right recipient.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full md:w-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking order...
                      </>
                    ) : (
                      <>
                        Track order
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  We keep you informed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Real-time visibility</h3>
                  <p>See the driver&apos;s live location, ETA, and delivery route as they make their way to the dropoff.</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Proof of delivery</h3>
                  <p>View photos, signature capture, and recipient confirmation once the delivery is complete.</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Need help?</h3>
                  <p>Can&apos;t find your order? Email <a className="text-accent font-medium hover:underline" href="mailto:support@preferredsolutions.com">support@preferredsolutions.com</a> and we&apos;ll be happy to assist.</p>
                </div>
                <Separator />
                <p className="text-xs">
                  Already have an account?{' '}
                  <a href="/customer/dashboard" className="text-accent font-medium hover:underline">
                    Sign in to your customer dashboard
                  </a>{' '}
                  for order history and invoices.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
