'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { useDemoAuth } from '@/app/hooks/useDemoAuth';
import { Settings, ListOrdered, Bell, Map as MapIcon, FileText, LogOut, User } from 'lucide-react';
import { useDispatcherSettings, type SuggestionAlgorithm } from '@/app/hooks/useDispatcherSettings';

const navItems = [
  { href: '/dispatcher', label: 'Order Queue', icon: ListOrdered },
  { href: '/dispatcher#notifications', label: 'Notifications', icon: Bell },
  { href: '/dispatcher#map', label: 'Map / Tracking', icon: MapIcon },
  { href: '/dispatcher#audit', label: 'Audit Log', icon: FileText },
  { href: '/dispatcher#settings', label: 'Settings', icon: Settings },
];

export function DispatcherSidebar() {
  const pathname = usePathname();
  const { demoUser } = useDemoAuth();
  const { settings, setAlgorithm } = useDispatcherSettings();

  const roleLabel = useMemo(() => {
    const role = demoUser?.role?.toLowerCase();
    if (!role) return 'Dispatcher';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, [demoUser]);

  const handleAlgoChange = (algo: SuggestionAlgorithm) => setAlgorithm(algo);

  return (
    <aside className="w-full md:w-72 md:min-h-[calc(100vh-4rem)] md:border-r border-border p-4 space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Welcome,</div>
            <div className="text-foreground font-medium">{demoUser?.name || 'Dispatcher'}</div>
            <Badge variant="secondary" className="mt-1 text-xs">{roleLabel}</Badge>
          </div>
        </div>
      </Card>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Button variant={active ? 'accent' : 'ghost'} className="w-full justify-start gap-2">
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div id="settings" className="space-y-3">
        <div className="text-xs font-semibold text-muted-foreground">Suggestion Algorithm</div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant={settings.algorithm === 'nearest' ? 'accent' : 'outline'}
            onClick={() => handleAlgoChange('nearest')}
            className="justify-start"
          >
            Nearest available
          </Button>
          <Button
            variant={settings.algorithm === 'workload' ? 'accent' : 'outline'}
            onClick={() => handleAlgoChange('workload')}
            className="justify-start"
          >
            Workload balancing
          </Button>
          <Button
            variant={settings.algorithm === 'roundRobin' ? 'accent' : 'outline'}
            onClick={() => handleAlgoChange('roundRobin')}
            className="justify-start"
          >
            Round robin
          </Button>
        </div>
      </div>

      <Separator />

      <form action="/auth/sign-out" method="post">
        <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Log Out
        </Button>
      </form>
    </aside>
  );
}


