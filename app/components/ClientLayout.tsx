'use client';

import type { ReactNode } from 'react';
import { GoogleMapsProvider } from '@/app/contexts/GoogleMaps';

export function ClientLayout({ children }: { children: ReactNode }) {
  return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
}
