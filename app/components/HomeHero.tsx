'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { AlertCircle } from 'lucide-react';

export default function HomeHero() {
  const router = useRouter();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const [pickupAutocomplete, setPickupAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [dropoffAutocomplete, setDropoffAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set('pickup', pickup);
    if (dropoff) params.set('dropoff', dropoff);
    router.push(`/quote?${params.toString()}`);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl">
      <div className="px-6 py-16 sm:px-12 lg:px-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Book a delivery in seconds
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            Start with pickup and dropoff. We'll calculate the distance and pricing instantly.
          </p>

          <form onSubmit={onSubmit} className="mt-8 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg">
            {loadError ? (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load Google Maps. Please check your API key configuration.</span>
              </div>
            ) : !isLoaded ? (
              <div className="text-gray-600 text-sm">Loading map…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pickup</label>
                  <Autocomplete onLoad={setPickupAutocomplete} onPlaceChanged={() => {
                    if (pickupAutocomplete) {
                      const place = pickupAutocomplete.getPlace();
                      setPickup(place.formatted_address || '');
                    }
                  }}>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      placeholder="Enter pickup location"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                    />
                  </Autocomplete>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dropoff</label>
                  <Autocomplete onLoad={setDropoffAutocomplete} onPlaceChanged={() => {
                    if (dropoffAutocomplete) {
                      const place = dropoffAutocomplete.getPlace();
                      setDropoff(place.formatted_address || '');
                    }
                  }}>
                    <input
                      type="text"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      placeholder="Enter dropoff location"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                    />
                  </Autocomplete>
                </div>
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Get quote
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}


