'use client';

import { useState } from 'react';
import { PRICING } from '@/lib/config';
import { calculatePrice } from '@/lib/pricing';
import { Card, CardHeader, CardTitle, Input, Button, Alert } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

export default function QuotePage() {
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

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader border={false}>
          <CardTitle>Get a Delivery Quote</CardTitle>
        </CardHeader>
        
        <div className="px-6 pb-8">
          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <Input
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />

            <Input
              label="Pickup Address"
              type="text"
              name="pickupAddress"
              value={formData.pickupAddress}
              onChange={handleInputChange}
              required
              placeholder="123 Main St, City, State ZIP"
            />

            <Input
              label="Dropoff Address"
              type="text"
              name="dropoffAddress"
              value={formData.dropoffAddress}
              onChange={handleInputChange}
              required
              placeholder="456 Oak Ave, City, State ZIP"
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Distance (miles)"
                type="number"
                name="distanceMiles"
                value={formData.distanceMiles}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                required
                helperText="Manual input for M1 - Google Maps integration coming next sprint"
              />

              <Input
                label="Weight (lbs)"
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                min="0"
                step="0.1"
              />
            </div>

            {pricing && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Price Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base fee:</span>
                    <span>{formatCurrency(pricing.baseFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mileage ({pricing.distanceMi} mi @ ${pricing.perMileRate}/mi):</span>
                    <span>{formatCurrency(pricing.perMileRate * pricing.distanceMi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel surcharge ({(pricing.fuelPct * 100).toFixed(0)}%):</span>
                    <span>{formatCurrency(pricing.fuel)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                </div>
              </div>
            )}


            <div>
              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full"
                size="lg"
              >
                Continue to Payment
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
