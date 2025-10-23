'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PRICING } from '@/lib/config';
import { calculatePrice } from '@/lib/pricing';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { calculateDistanceClient } from '@/lib/google-maps/distance';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { LoadingState } from '@/app/components/shared/LoadingState';
import { 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Package, 
  Calculator,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  TrendingUp
} from 'lucide-react';

function GoogleMapsAutocompleteInput({ value, onChange, id, name, label, required, icon: Icon, sessionToken }: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  name: string;
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  sessionToken?: google.maps.places.AutocompleteSessionToken | null;
}) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Autocomplete
        onLoad={(ac) => {
          setAutocomplete(ac);
          try {
            ac.setOptions({
              fields: ['formatted_address','geometry','place_id','name'],
              // types: ['address'],
              // componentRestrictions: { country: 'us' },
            });
          } catch {}
        }}
        onPlaceChanged={() => {
          if (autocomplete) {
            const place = autocomplete.getPlace();
            onChange(place.formatted_address || place.name || '');
          }
        }}
      >
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
          <Input
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={e => onChange(e.target.value)}
            required={required}
            className={Icon ? 'pl-10' : ''}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
      </Autocomplete>
    </div>
  );
}

export default function QuotePage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pickupAddress: '',
    dropoffAddress: '',
    distanceMiles: '',
    weight: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places && !sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  // Prefill from URL params
  useEffect(() => {
    const pickup = searchParams.get('pickup') || '';
    const dropoff = searchParams.get('dropoff') || '';
    if (pickup || dropoff) {
      setFormData(prev => ({
        ...prev,
        pickupAddress: pickup || prev.pickupAddress,
        dropoffAddress: dropoff || prev.dropoffAddress,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-calculate distance when both addresses are filled
  useEffect(() => {
    const calculateDistanceAuto = async () => {
      if (!formData.pickupAddress || !formData.dropoffAddress) {
        return;
      }

      // Don't recalculate if we already have a distance
      if (formData.distanceMiles) {
        return;
      }

      setIsCalculatingDistance(true);
      setDistanceError('');

      try {
        let result;
        if (isLoaded && window.google?.maps?.DistanceMatrixService) {
          result = await calculateDistanceClient(
            formData.pickupAddress,
            formData.dropoffAddress
          );
        } else {
          const res = await fetch('/api/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: formData.pickupAddress,
              destination: formData.dropoffAddress,
            }),
          });
          if (!res.ok) throw new Error('Server distance failed');
          result = await res.json();
        }
        setFormData(prev => ({
          ...prev,
          distanceMiles: result.distanceMiles.toString(),
        }));
      } catch (err) {
        console.error('Distance calculation error:', err);
        setDistanceError('Could not calculate distance automatically. Please enter manually.');
      } finally {
        setIsCalculatingDistance(false);
      }
    };

    const timeoutId = setTimeout(calculateDistanceAuto, 1000); // Debounce for 1 second
    return () => clearTimeout(timeoutId);
  }, [formData.pickupAddress, formData.dropoffAddress, isLoaded, formData.distanceMiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.pickupAddress || 
          !formData.dropoffAddress || !formData.distanceMiles) {
        throw new Error('Please fill in all required fields');
      }

      const distanceMi = parseFloat(formData.distanceMiles);
      if (isNaN(distanceMi) || distanceMi <= 0) {
        throw new Error('Please enter a valid distance');
      }

      // Submit quote
      const quoteResponse = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          pickupAddress: formData.pickupAddress,
          dropoffAddress: formData.dropoffAddress,
          distanceMi,
          weightLb: formData.weight ? parseFloat(formData.weight) : undefined,
        }),
      });

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json();
        throw new Error(errorData.error || 'Failed to create quote');
      }

      const { quoteId } = await quoteResponse.json();

      // Create checkout session
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await checkoutResponse.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  // Calculate pricing preview
  const distanceMi = parseFloat(formData.distanceMiles) || 0;
  const pricing = distanceMi > 0 ? calculatePrice({
    ...PRICING,
    distanceMi,
  }) : null;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading Google Maps..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-[1000px] mx-auto" data-testid="quote-page">
        <PageHeader
          title="Get a Delivery Quote"
          description="Fill in your delivery details and get an instant price estimate"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Request Quote' },
          ]}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-accent" />
                    Customer Information
                  </CardTitle>
                  <CardDescription>
                    Provide your contact details for order updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="pl-10"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="pl-10"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone (Optional)</Label>
                      <div className="relative mt-2">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="pl-10"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-accent" />
                    Delivery Details
                  </CardTitle>
                  <CardDescription>
                    Enter pickup and dropoff locations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GoogleMapsAutocompleteInput
                    id="pickupAddress"
                    name="pickupAddress"
                    label="Pickup Address"
                    value={formData.pickupAddress}
                    onChange={val => setFormData(f => ({ ...f, pickupAddress: val, distanceMiles: '' }))}
                    required
                    icon={MapPin}
                  />

                  <GoogleMapsAutocompleteInput
                    id="dropoffAddress"
                    name="dropoffAddress"
                    label="Dropoff Address"
                    value={formData.dropoffAddress}
                    onChange={val => setFormData(f => ({ ...f, dropoffAddress: val, distanceMiles: '' }))}
                    required
                    icon={MapPin}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="distanceMiles">
                        Distance (miles) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-2">
                        <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          id="distanceMiles"
                          name="distanceMiles"
                          value={formData.distanceMiles}
                          onChange={handleInputChange}
                          min="0"
                          step="0.1"
                          required
                          className="pl-10"
                          placeholder="0.0"
                        />
                      </div>
                      {isCalculatingDistance && (
                        <p className="mt-1.5 text-xs text-accent flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Calculating distance...
                        </p>
                      )}
                      {distanceError && (
                        <p className="mt-1.5 text-xs text-warning flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {distanceError}
                        </p>
                      )}
                      {!isCalculatingDistance && !distanceError && formData.distanceMiles && (
                        <p className="mt-1.5 text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Distance calculated automatically
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="weight">Weight (lbs) <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                      <div className="relative mt-2">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          id="weight"
                          name="weight"
                          value={formData.weight}
                          onChange={handleInputChange}
                          min="0"
                          step="0.1"
                          className="pl-10"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-accent" />
                    Price Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pricing ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Base fee</span>
                          <span className="font-medium">${pricing.baseFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Mileage ({pricing.distanceMi} mi)
                          </span>
                          <span className="font-medium">
                            ${(pricing.perMileRate * pricing.distanceMi).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Fuel surcharge ({(pricing.fuelPct * 100).toFixed(0)}%)
                          </span>
                          <span className="font-medium">${pricing.fuel.toFixed(2)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-accent">
                          ${pricing.total.toFixed(2)}
                        </span>
                      </div>

                      <Button
                        type="submit"
                        variant="accent"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Continue to Payment
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        Secure payment powered by Stripe
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="rounded-full bg-muted p-4 inline-flex mb-3">
                        <Calculator className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Fill in the delivery details to see pricing
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-destructive mb-1">Error</h4>
                    <p className="text-sm text-destructive/90">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
