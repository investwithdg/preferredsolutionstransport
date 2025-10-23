'use client';

import { PageHeader } from '@/app/components/shared/PageHeader';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { useDemoAuth } from '@/app/hooks/useDemoAuth';

export default function DispatcherProfilePage() {
  const { demoUser } = useDemoAuth();

  return (
    <div className="container max-w-[1000px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="My Profile"
        description="Manage your dispatcher profile and basics"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dispatcher', href: '/dispatcher' }, { label: 'Profile' }]}
      />
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Name</div>
            <div className="text-foreground font-medium">{demoUser?.name || 'Dispatcher'}</div>
            <div className="text-sm text-muted-foreground mt-4">Email</div>
            <div className="text-foreground font-medium">{(demoUser as any)?.email || '—'}</div>
            <div className="text-sm text-muted-foreground mt-4">Role</div>
            <div><Badge variant="secondary" className="capitalize">{(demoUser as any)?.role?.toLowerCase() || 'dispatcher'}</Badge></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


