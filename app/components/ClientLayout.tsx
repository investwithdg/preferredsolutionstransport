'use client';

import dynamic from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';

const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DemoProviderLazy = isDemoEnabled
  ? dynamic(() => import('@/app/demo/DemoContext').then(m => m.DemoProvider), { ssr: false })
  : null;

const DemoRoleSwitcherLazy = isDemoEnabled
  ? dynamic(() => import('@/app/demo/DemoRoleSwitcher').then(m => m.DemoRoleSwitcher), { ssr: false })
  : null;

export function ClientLayout({ children }: { children: ReactNode }) {
  if (!isDemoEnabled) {
    return <>{children}</>;
  }

  const DemoProvider = DemoProviderLazy as unknown as ComponentType<{ children: ReactNode }>;
  const DemoRoleSwitcher = DemoRoleSwitcherLazy as unknown as ComponentType<{}>;

  return (
    <DemoProvider>
      {children}
      <DemoRoleSwitcher />
    </DemoProvider>
  );
}
