'use client';

import dynamic from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';

// Always import demo components dynamically, but only render them if enabled
// This allows Vercel builds to include demo code that can be activated via env var
const DemoProviderLazy = dynamic(
  () => import('@/app/demo/DemoContext').then(m => m.DemoProvider),
  { ssr: false }
);

const DemoRoleSwitcherLazy = dynamic(
  () => import('@/app/demo/DemoRoleSwitcher').then(m => m.DemoRoleSwitcher),
  { ssr: false }
);

export function ClientLayout({ children }: { children: ReactNode }) {
  // Check demo mode at runtime instead of build time
  // This allows enabling demo mode on Vercel without rebuilding
  const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  
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
