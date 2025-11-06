'use client';

import DispatcherClient from './DispatcherClient';

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
  return <DispatcherClient initialOrders={initialOrders} drivers={drivers} />;
}
