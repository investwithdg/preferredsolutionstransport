// Pricing configuration for Milestone 1
// TODO: Move to database configuration in later milestones
export const PRICING = {
  baseFee: 50,
  perMileRate: 2,
  fuelPct: 0.10, // 10% fuel surcharge
  currency: 'usd'
} as const;
