'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateDemoOrders, type DemoOrder } from './demoData';

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
  // Demo orders management
  demoOrders: DemoOrder[];
  assignDemoOrder: (orderId: string, driverId: string) => void;
  updateDemoOrderStatus: (orderId: string, status: string) => void;
  resetDemoOrders: () => void;
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
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>([]);

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
    const savedOrders = localStorage.getItem('demo-orders');
    
    if (savedRole) {
      setCurrentRole(savedRole);
    }
    if (savedDriverId) {
      setCurrentDriverId(savedDriverId);
    }
    if (savedOrders) {
      try {
        setDemoOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error('Failed to parse saved demo orders', e);
        setDemoOrders(generateDemoOrders());
      }
    } else {
      // Initialize with default demo orders
      setDemoOrders(generateDemoOrders());
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
    
    if (demoOrders.length > 0) {
      localStorage.setItem('demo-orders', JSON.stringify(demoOrders));
    }
  }, [isDemoMode, currentRole, currentDriverId, demoOrders]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (!isDemoMode) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'demo-orders' && e.newValue) {
        try {
          setDemoOrders(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse demo orders from storage event', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isDemoMode]);

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

  const assignDemoOrder = (orderId: string, driverId: string) => {
    setDemoOrders(prev => {
      const updatedOrders = prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              driver_id: driverId, 
              status: 'Assigned',
              updated_at: new Date().toISOString()
            }
          : order
      );

      // Send push notification in demo mode
      const assignedOrder = updatedOrders.find(o => o.id === orderId);
      if (assignedOrder && 'Notification' in window && Notification.permission === 'granted') {
        const driverName = DEMO_DRIVERS.find(d => d.id === driverId)?.name || 'Driver';
        
        // Create notification
        const notification = new Notification('🚚 New Delivery Assignment', {
          body: `${driverName} assigned to Order #${orderId.slice(-8)} – ${assignedOrder.quotes.pickup_address} → ${assignedOrder.quotes.dropoff_address}`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `order-${orderId}`,
          requireInteraction: false,
        });

        // Optional: handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      return updatedOrders;
    });
  };

  const updateDemoOrderStatus = (orderId: string, status: string) => {
    setDemoOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      )
    );
  };

  const resetDemoOrders = () => {
    const fresh = generateDemoOrders();
    setDemoOrders(fresh);
    localStorage.setItem('demo-orders', JSON.stringify(fresh));
  };

  const value: DemoContextType = {
    isDemoMode,
    currentRole,
    currentDriverId,
    setRole,
    setDriverId,
    demoDrivers: DEMO_DRIVERS,
    demoOrders,
    assignDemoOrder,
    updateDemoOrderStatus,
    resetDemoOrders,
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

