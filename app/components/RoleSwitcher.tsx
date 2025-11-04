'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type UserRole = 'recipient' | 'driver' | 'dispatcher' | 'admin';

interface RoleSwitcherProps {
  currentRole: string | null;
}

export function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (isLoading || newRole === currentRole) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to switch role');
      }

      toast.success(`Switched to ${newRole} role`);

      // Redirect to the appropriate dashboard
      const redirectPath =
        newRole === 'driver'
          ? '/driver'
          : newRole === 'dispatcher' || newRole === 'admin'
            ? '/dispatcher'
            : '/customer/dashboard';

      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error('[Role Switcher] Error:', error);
      toast.error('Failed to switch role');
    } finally {
      setIsLoading(false);
    }
  };

  const roles: { value: UserRole; label: string }[] = [
    { value: 'recipient', label: 'Customer' },
    { value: 'driver', label: 'Driver' },
    { value: 'dispatcher', label: 'Dispatcher' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <div className="relative inline-block text-left">
      <select
        value={currentRole || 'recipient'}
        onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
        disabled={isLoading}
        className="text-sm bg-accent/10 text-accent border border-accent/20 rounded-lg px-3 py-1.5 hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}
