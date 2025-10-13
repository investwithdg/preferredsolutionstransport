'use client';

import { DemoProvider } from '@/app/contexts/DemoContext';
import { DemoRoleSwitcher } from '@/app/components/demo/DemoRoleSwitcher';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      {children}
      <DemoRoleSwitcher />
    </DemoProvider>
  );
}
