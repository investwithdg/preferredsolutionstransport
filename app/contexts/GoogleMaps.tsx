'use client';

import { createContext, useContext } from 'react';
import { useLoadScript } from '@react-google-maps/api';

type GoogleMapsContextType = {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKeyPresent: boolean;
};

const GoogleMapsContext = createContext<GoogleMapsContextType | null>(null);

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries: ['places', 'geometry'],
    id: 'google-maps-script',
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError: loadError as any, apiKeyPresent: !!apiKey }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const ctx = useContext(GoogleMapsContext);
  if (!ctx) return { isLoaded: false, loadError: undefined as any, apiKeyPresent: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY };
  return ctx;
}


