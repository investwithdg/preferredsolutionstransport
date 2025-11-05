'use client';

// Minimal stub to satisfy demo-related imports in production builds.
// Returns non-demo defaults to avoid runtime impact when demo mode isn't used.

export type DemoDriver = {
  id: string;
  name: string;
};

export type DemoOrder = any;

type UseDemoReturn = {
  isDemoMode: boolean;
  currentDriverId: string | null;
  demoDrivers: DemoDriver[];
  demoOrders: DemoOrder[];
  assignDemoOrder: (orderId: string, driverId: string) => void;
  updateDemoOrderStatus: (orderId: string, status: string) => void;
};

export function useDemo(): UseDemoReturn {
  return {
    isDemoMode: false,
    currentDriverId: null,
    demoDrivers: [],
    demoOrders: [],
    assignDemoOrder: () => {},
    updateDemoOrderStatus: () => {},
  };
}
