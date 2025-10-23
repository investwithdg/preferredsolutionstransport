'use client';

import { PageHeader } from '@/app/components/shared/PageHeader';
import FleetMap from '@/app/components/maps/FleetMap';
import { useRealtimeOrders } from '@/app/hooks/useRealtimeOrders';
import { useRealtimeDrivers } from '@/app/hooks/useRealtimeDrivers';
import { useDriverLocations } from '@/app/hooks/useDriverLocations';
import { Card, CardContent } from '@/app/components/ui/card';

export default function DispatcherMapPage() {
  const { orders } = useRealtimeOrders({});
  const { drivers } = useRealtimeDrivers([]);
  const { locations } = useDriverLocations({ drivers, orders });

  return (
    <div className="container max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Map & Tracking"
        description="Live fleet locations and active routes"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dispatcher', href: '/dispatcher' }, { label: 'Map' }]}
      />
      <Card className="h-[70vh]">
        <CardContent className="p-0 h-full">
          <FleetMap
            orders={orders as any}
            drivers={drivers as any}
            driverLocations={locations}
            onSelect={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
}


