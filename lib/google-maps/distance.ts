/**
 * Google Maps Distance Matrix API integration
 * Calculates distance between two addresses
 */

export type DistanceResult = {
  distanceMiles: number;
  durationMinutes: number;
  distanceText: string;
  durationText: string;
};

/**
 * Calculate distance between two addresses using Google Maps Distance Matrix API
 * @param origin - Starting address
 * @param destination - Ending address
 * @returns Distance and duration information
 */
export async function calculateDistance(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.append('origins', origin);
  url.searchParams.append('destinations', destination);
  url.searchParams.append('units', 'imperial'); // Use miles
  url.searchParams.append('key', apiKey);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error('Failed to fetch distance from Google Maps');
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${data.status}`);
  }

  const element = data.rows[0]?.elements[0];

  if (!element || element.status !== 'OK') {
    throw new Error('Could not calculate distance between addresses');
  }

  // Convert meters to miles
  const distanceMeters = element.distance.value;
  const distanceMiles = Math.round((distanceMeters / 1609.34) * 10) / 10; // Round to 1 decimal

  // Convert seconds to minutes
  const durationSeconds = element.duration.value;
  const durationMinutes = Math.round(durationSeconds / 60);

  return {
    distanceMiles,
    durationMinutes,
    distanceText: element.distance.text,
    durationText: element.duration.text,
  };
}

/**
 * Client-side distance calculation using browser's Google Maps API
 * This is used when the Google Maps JavaScript API is already loaded
 */
export async function calculateDistanceClient(
  origin: string,
  destination: string
): Promise<DistanceResult> {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
      },
      (response, status) => {
        if (status !== 'OK' || !response) {
          reject(new Error(`Distance calculation failed: ${status}`));
          return;
        }

        const element = response.rows[0]?.elements[0];

        if (!element || element.status !== 'OK') {
          reject(new Error('Could not calculate distance between addresses'));
          return;
        }

        // Distance is already in miles due to IMPERIAL unit system
        const distanceMiles = Math.round((element.distance.value / 1609.34) * 10) / 10;
        const durationMinutes = Math.round(element.duration.value / 60);

        resolve({
          distanceMiles,
          durationMinutes,
          distanceText: element.distance.text,
          durationText: element.duration.text,
        });
      }
    );
  });
}
