'use client';

import { PageHeader } from '@/app/components/shared/PageHeader';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

export default function DispatcherNotificationsPage() {
  return (
    <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Notifications"
        description="System and assignment notifications"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dispatcher', href: '/dispatcher' }, { label: 'Notifications' }]}
      />
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <Badge variant="secondary">Live</Badge>
          </div>
          <p className="text-sm text-muted-foreground">No new notifications</p>
        </CardContent>
      </Card>
    </div>
  );
}


