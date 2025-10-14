'use client';

import { useDemo } from '@/app/demo/DemoContext';
import DispatcherClient from './DispatcherClient';
import { useEffect, useState } from 'react';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_details?: any;
  active_orders_count: number;
  is_available: boolean;
}

interface DispatcherWrapperProps {
  initialOrders: any[];
  drivers: Driver[];
}

export default function DispatcherWrapper({ initialOrders, drivers }: DispatcherWrapperProps) {
  const { isDemoMode, demoDrivers } = useDemo();
  const [demoOrders, setDemoOrders] = useState<any[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      (async () => {
        const { generateDemoOrders, createTestOrder } = await import('@/app/demo/demoData');
        // Generate demo orders
        let orders = generateDemoOrders();

        // Check for additional test orders from quick actions
        const testOrders = JSON.parse(localStorage.getItem('demo-test-orders') || '[]');
        if (testOrders.length > 0) {
          // Add test orders to the list
          testOrders.forEach((test: any) => {
            const newOrder = createTestOrder();
            newOrder.id = test.id;
            newOrder.created_at = test.createdAt;
            orders.unshift(newOrder);
          });
        }

        setDemoOrders(orders);
      })();
    }
  }, [isDemoMode]);

  if (isDemoMode) {
    // Use demo drivers
    const demoDriverList = demoDrivers.map(driver => ({
      id: driver.id,
      name: driver.name,
      phone: '(555) 123-4567',
      vehicle_details: { type: 'Van', plate: 'DEMO-123' },
      active_orders_count: driver.id === 'demo-driver-1' ? 1 : 0,
      is_available: driver.id !== 'demo-driver-1',
    }));

    return (
      <DispatcherClient 
        initialOrders={demoOrders} 
        drivers={demoDriverList} 
      />
    );
  }

  return (
    <DispatcherClient 
      initialOrders={initialOrders} 
      drivers={drivers} 
    />
  );
}
