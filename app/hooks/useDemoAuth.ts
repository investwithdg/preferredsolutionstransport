'use client';

type DemoRole = 'recipient' | 'driver' | 'dispatcher' | 'admin';

type DemoUser = {
  name?: string;
  email?: string;
  role?: DemoRole;
} | null;

export function useDemoAuth(): { demoUser: DemoUser } {
  return { demoUser: null };
}
