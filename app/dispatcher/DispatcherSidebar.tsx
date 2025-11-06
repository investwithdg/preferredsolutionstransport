'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { Settings, ListOrdered, Bell, Map as MapIcon, FileText, LogOut, User } from 'lucide-react';

const navItems = [
  { href: '/dispatcher/profile', label: 'Profile', icon: User },
  { href: '/dispatcher', label: 'Order Queue', icon: ListOrdered },
  { href: '/dispatcher/notifications', label: 'Notifications', icon: Bell },
  { href: '/dispatcher/map', label: 'Map / Tracking', icon: MapIcon },
  { href: '/dispatcher/audit', label: 'Audit Log', icon: FileText },
  { href: '/dispatcher/settings', label: 'Settings', icon: Settings },
];

export function DispatcherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-72 md:min-h-[calc(100vh-4rem)] md:border-r border-border p-4 space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Welcome,</div>
            <div className="text-foreground font-medium">Dispatcher</div>
            <Badge variant="secondary" className="mt-1 text-xs">Dispatcher</Badge>
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

      <form action="/auth/sign-out" method="post">
        <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Log Out
        </Button>
      </form>
    </aside>
  );
}


