'use client';

import { useState, useEffect } from 'react';
import { PRICING } from '@/lib/config';
import { calculatePrice } from '@/lib/pricing';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { calculateDistanceClient } from '@/lib/google-maps/distance';

function GoogleMapsAutocompleteInput({ value, onChange, id, name, label, required }: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>
      <Autocomplete
        onLoad={setAutocomplete}
        onPlaceChanged={() => {
          if (autocomplete) {
            const place = autocomplete.getPlace();
            onChange(place.formatted_address || '');
          }
        }}
      >
        <input
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        />
      </Autocomplete>
    </div>
  );
}

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
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  // Auto-calculate distance when both addresses are filled
  useEffect(() => {
    const calculateDistanceAuto = async () => {
      if (!isLoaded || !formData.pickupAddress || !formData.dropoffAddress) {
        return;
      }

      // Don't recalculate if we already have a distance
      if (formData.distanceMiles) {
        return;
      }

      setIsCalculatingDistance(true);
      setDistanceError('');

      try {
        const result = await calculateDistanceClient(
          formData.pickupAddress,
          formData.dropoffAddress
        );
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

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Get a Delivery Quote</h1>
          {!isLoaded ? (
            <div>Loading Google Maps...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                />
              </div>

              <div>
                <GoogleMapsAutocompleteInput
                  id="pickupAddress"
                  name="pickupAddress"
                  label="Pickup Address"
                  value={formData.pickupAddress}
                  onChange={val => setFormData(f => ({ ...f, pickupAddress: val }))}
                  required
                />
              </div>

              <div>
                <GoogleMapsAutocompleteInput
                  id="dropoffAddress"
                  name="dropoffAddress"
                  label="Dropoff Address"
                  value={formData.dropoffAddress}
                  onChange={val => setFormData(f => ({ ...f, dropoffAddress: val }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="distanceMiles" className="block text-sm font-medium text-gray-700">
                    Distance (miles) *
                  </label>
                  <input
                    type="number"
                    id="distanceMiles"
                    name="distanceMiles"
                    value={formData.distanceMiles}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  />
                  {isCalculatingDistance && (
                    <p className="mt-1 text-sm text-blue-600">
                      Calculating distance...
                    </p>
                  )}
                  {distanceError && (
                    <p className="mt-1 text-sm text-yellow-600">
                      {distanceError}
                    </p>
                  )}
                  {!isCalculatingDistance && !distanceError && formData.distanceMiles && (
                    <p className="mt-1 text-sm text-green-600">
                      ✓ Distance calculated automatically
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  />
                </div>
              </div>

              {pricing && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Price Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Base fee:</span>
                      <span>${pricing.baseFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mileage ({pricing.distanceMi} mi @ ${pricing.perMileRate}/mi):</span>
                      <span>${(pricing.perMileRate * pricing.distanceMi).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel surcharge ({(pricing.fuelPct * 100).toFixed(0)}%):</span>
                      <span>${pricing.fuel.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Total:</span>
                      <span>${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Continue to Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
