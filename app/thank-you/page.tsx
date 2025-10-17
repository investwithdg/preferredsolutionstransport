'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { 
  CheckCircle2, 
  Package, 
  Mail, 
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  TruckIcon
} from 'lucide-react';

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState<any>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // In a real implementation, fetch order details using session_id
    // For now, show success message
    if (sessionId) {
      // Mock order data - in production, fetch from API
      setOrderData({
        orderId: 'ORD-' + sessionId.slice(-8).toUpperCase(),
        status: 'ReadyForDispatch',
        total: 99.00,
        createdAt: new Date().toISOString(),
      });
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-[800px] mx-auto" data-testid="thank-you-page">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          
          <h1 className="text-display font-semibold text-foreground mb-3">
            Payment Successful!
          </h1>
          
          <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
            Thank you for choosing Preferred Solutions Transport. Your delivery has been scheduled.
          </p>
        </div>

        {/* Order Details Card */}
        {orderData && (
          <Card className="mb-6 border-2 border-success/20">
            <CardHeader className="bg-success/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="h-5 w-5 text-success" />
                    <span className="text-heading-md font-semibold">Order Confirmed</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Order ID: {orderData.orderId}
                  </p>
                </div>
                <Badge variant="success" className="text-sm">
                  Paid • Ready for Dispatch
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-accent/10 p-2">
                      <Calendar className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Order Date</p>
                      <p className="text-sm font-medium">
                        {new Date(orderData.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-success/10 p-2">
                      <DollarSign className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-sm font-medium">${orderData.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-warning/10 p-2">
                      <TruckIcon className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-medium">Ready for Dispatch</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-accent/10 p-2">
                      <MapPin className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Next Step</p>
                      <p className="text-sm font-medium">Driver Assignment</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="accent" size="lg" className="flex-1">
                  <Link href={`/track/${orderData.orderId}`}>
                    <Package className="h-4 w-4 mr-2" />
                    Track Your Order
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <Link href="/quote">
                    Request Another Delivery
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What Happens Next */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-heading-md font-semibold flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-accent" />
              What Happens Next?
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-success/10 p-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="w-0.5 h-full bg-border" />
              </div>
              <div className="pb-6">
                <p className="font-medium text-sm mb-1">Payment Confirmed</p>
                <p className="text-xs text-muted-foreground">
                  Your payment has been processed successfully
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-accent/10 p-2 mb-2">
                  <TruckIcon className="h-4 w-4 text-accent" />
                </div>
                <div className="w-0.5 h-full bg-border" />
              </div>
              <div className="pb-6">
                <p className="font-medium text-sm mb-1">Driver Assignment</p>
                <p className="text-xs text-muted-foreground">
                  Our dispatch team will assign a driver to your order within 30 minutes
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-accent/10 p-2 mb-2">
                  <MapPin className="h-4 w-4 text-accent" />
                </div>
                <div className="w-0.5 h-full bg-border" />
              </div>
              <div className="pb-6">
                <p className="font-medium text-sm mb-1">Pickup & Delivery</p>
                <p className="text-xs text-muted-foreground">
                  Track your delivery in real-time from pickup to dropoff
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-success/10 p-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              </div>
              <div>
                <p className="font-medium text-sm mb-1">Confirmation</p>
                <p className="text-xs text-muted-foreground">
                  Receive proof of delivery and receipt via email
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email & Support Card */}
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Receipt & Updates
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A confirmation email with your order details has been sent. You'll receive updates as your delivery progresses.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 text-sm">
                  <a 
                    href="mailto:support@preferredsolutions.com" 
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <Mail className="h-4 w-4" />
                    support@preferredsolutions.com
                  </a>
                  <a 
                    href="tel:+15551234567" 
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="h-4 w-4" />
                    (555) 123-4567
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
