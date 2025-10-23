'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { AlertCircle } from 'lucide-react';

export default function HomeHero() {
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Debug logging
  useEffect(() => {
    console.log('[Google Maps Debug] API Key present:', !!apiKey);
    console.log('[Google Maps Debug] API Key length:', apiKey?.length || 0);
  }, [apiKey]);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries: ['places'],
  });

  const [pickupAutocomplete, setPickupAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [dropoffAutocomplete, setDropoffAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (isLoaded && window.google?.maps?.places && !sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);
  
  // Log any load errors
  useEffect(() => {
    if (loadError) {
      console.error('[Google Maps Debug] Load error:', loadError);
    }
    if (isLoaded) {
      console.log('[Google Maps Debug] Successfully loaded');
      console.log('[Google Maps Debug] Libraries available:', {
        maps: !!window.google?.maps,
        places: !!window.google?.maps?.places,
      });
    }
  }, [isLoaded, loadError]);

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
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-800">Unable to load Google Maps</p>
                    <p className="mt-1 text-red-700">
                      {!apiKey 
                        ? 'API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.'
                        : 'Please check your API key configuration and ensure Maps JavaScript API and Places API are enabled.'}
                    </p>
                    <p className="mt-2 text-xs text-red-600">
                      See console for detailed error information.
                    </p>
                  </div>
                </div>
              </div>
            ) : !isLoaded ? (
              <div className="text-gray-600 text-sm">Loading map…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pickup</label>
                  <Autocomplete onLoad={(ac) => {
                    setPickupAutocomplete(ac);
                    try {
                      ac.setOptions({
                        fields: ['formatted_address', 'geometry', 'place_id', 'name'],
                        // types: ['address'],
                        // componentRestrictions: { country: 'us' },
                      });
                    } catch {}
                  }} onPlaceChanged={() => {
                    if (pickupAutocomplete) {
                      const place = pickupAutocomplete.getPlace();
                      setPickup(place.formatted_address || place.name || '');
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
                  <Autocomplete onLoad={(ac) => {
                    setDropoffAutocomplete(ac);
                    try {
                      ac.setOptions({
                        fields: ['formatted_address', 'geometry', 'place_id', 'name'],
                        // types: ['address'],
                        // componentRestrictions: { country: 'us' },
                      });
                    } catch {}
                  }} onPlaceChanged={() => {
                    if (dropoffAutocomplete) {
                      const place = dropoffAutocomplete.getPlace();
                      setDropoff(place.formatted_address || place.name || '');
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


