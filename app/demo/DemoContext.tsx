'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type DemoRole = 'customer' | 'dispatcher' | 'driver' | 'admin';

interface DemoDriver {
  id: string;
  name: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  currentRole: DemoRole;
  currentDriverId: string | null;
  setRole: (role: DemoRole) => void;
  setDriverId: (driverId: string | null) => void;
  demoDrivers: DemoDriver[];
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

// Demo drivers for testing
const DEMO_DRIVERS: DemoDriver[] = [
  { id: 'demo-driver-1', name: 'John Smith (Demo)' },
  { id: 'demo-driver-2', name: 'Sarah Johnson (Demo)' },
  { id: 'demo-driver-3', name: 'Mike Davis (Demo)' },
];

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  
  const [currentRole, setCurrentRole] = useState<DemoRole>('customer');
  const [currentDriverId, setCurrentDriverId] = useState<string | null>(null);

  // Set demo mode cookie for middleware
  useEffect(() => {
    if (isDemoMode) {
      document.cookie = 'demo-mode=true; path=/';
    } else {
      document.cookie = 'demo-mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    }
  }, [isDemoMode]);

  // Load saved demo state from localStorage
  useEffect(() => {
    if (!isDemoMode) return;
    
    const savedRole = localStorage.getItem('demo-role') as DemoRole;
    const savedDriverId = localStorage.getItem('demo-driver-id');
    
    if (savedRole) {
      setCurrentRole(savedRole);
    }
    if (savedDriverId) {
      setCurrentDriverId(savedDriverId);
    }
  }, [isDemoMode]);

  // Save demo state to localStorage
  useEffect(() => {
    if (!isDemoMode) return;
    
    localStorage.setItem('demo-role', currentRole);
    if (currentDriverId) {
      localStorage.setItem('demo-driver-id', currentDriverId);
    } else {
      localStorage.removeItem('demo-driver-id');
    }
  }, [isDemoMode, currentRole, currentDriverId]);

  const setRole = (role: DemoRole) => {
    setCurrentRole(role);
    
    // Navigate to appropriate page based on role
    switch (role) {
      case 'customer':
        router.push('/');
        break;
      case 'dispatcher':
        router.push('/dispatcher');
        break;
      case 'driver':
        router.push('/driver');
        break;
      case 'admin':
        router.push('/admin');
        break;
    }
  };

  const setDriverId = (driverId: string | null) => {
    setCurrentDriverId(driverId);
  };

  const value: DemoContextType = {
    isDemoMode,
    currentRole,
    currentDriverId,
    setRole,
    setDriverId,
    demoDrivers: DEMO_DRIVERS,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}


