'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

export default function DispatcherAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Audit Log"
        description="System events and activity history"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dispatcher', href: '/dispatcher' }, { label: 'Audit Log' }]}
      />
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Event Stream</h3>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events</p>
          ) : (
            <div className="text-xs max-h-[60vh] overflow-auto space-y-1">
              {logs.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between border-b border-border/50 py-1">
                  <span className="font-mono">{l.event_type}</span>
                  <span className="text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


