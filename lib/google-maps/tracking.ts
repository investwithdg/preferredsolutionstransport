/**
 * Google Maps utilities for live driver tracking
 */

export type LatLng = {
  lat: number;
  lng: number;
};

export type DriverLocation = {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  created_at: string;
};

/**
 * @deprecated Use @react-google-maps/api's useLoadScript hook instead
 */
export function loadGoogleMapsScript(_apiKey: string): Promise<void> {
  console.warn('loadGoogleMapsScript is deprecated. Use @react-google-maps/api\'s useLoadScript hook instead.');
  return Promise.resolve();
}

/**
 * Calculate distance between two coordinates (in miles)
 */
export function calculateDistanceMiles(from: LatLng, to: LatLng): number {
  if (!window.google?.maps) {
    throw new Error('Google Maps not loaded');
  }

  const fromLatLng = new google.maps.LatLng(from.lat, from.lng);
  const toLatLng = new google.maps.LatLng(to.lat, to.lng);
  
  const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(
    fromLatLng,
    toLatLng
  );
  
  // Convert meters to miles
  return Math.round((distanceMeters / 1609.34) * 10) / 10;
}

/**
 * Calculate estimated time of arrival based on distance and average speed
 * @param distanceMiles - Distance in miles
 * @param avgSpeedMph - Average speed in miles per hour (default: 30)
 * @returns ETA in minutes
 */
export function calculateETA(distanceMiles: number, avgSpeedMph: number = 30): number {
  const hours = distanceMiles / avgSpeedMph;
  return Math.round(hours * 60);
}

/**
 * Format ETA for display
 */
export function formatETA(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!window.google?.maps) {
    throw new Error('Google Maps not loaded');
  }

  const geocoder = new google.maps.Geocoder();
  
  try {
    const result = await geocoder.geocode({ address });
    
    if (result.results && result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Create a custom truck marker icon
 */
export function createTruckMarkerIcon(heading?: number): google.maps.Symbol {
  const rotation = heading || 0;
  
  return {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: '#3b82f6',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    rotation: rotation,
    anchor: new google.maps.Point(0, 2.5),
  } as google.maps.Symbol;
}

/**
 * Get current user location
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Watch user location for continuous tracking
 */
export function watchLocation(
  onUpdate: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }

  return navigator.geolocation.watchPosition(
    onUpdate,
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000, // Accept cached position up to 30 seconds old
    }
  );
}

/**
 * Stop watching location
 */
export function clearWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}

