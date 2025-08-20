// Pricing calculation utilities

export type PricingInput = {
  baseFee: number;
  perMileRate: number;
  fuelPct: number;
  distanceMi: number;
  weightLb?: number;
};

export type PricingResult = {
  baseFee: number;
  perMileRate: number;
  fuelPct: number;
  distanceMi: number;
  subtotal: number;
  fuel: number;
  total: number;
};

/**
 * Calculate delivery pricing based on distance and configuration
 * 
 * @param params - Pricing input parameters
 * @returns Detailed pricing breakdown
 */
export function calculatePrice({ 
  baseFee, 
  perMileRate, 
  fuelPct, 
  distanceMi 
}: PricingInput): PricingResult {
  const mileage = perMileRate * distanceMi;
  const subtotal = baseFee + mileage;
  const fuel = subtotal * fuelPct; // e.g. 0.10 for 10%
  const total = Math.round((subtotal + fuel) * 100) / 100; // Round to 2 decimal places
  
  return { 
    baseFee, 
    perMileRate, 
    fuelPct, 
    distanceMi, 
    subtotal, 
    fuel, 
    total 
  };
}
