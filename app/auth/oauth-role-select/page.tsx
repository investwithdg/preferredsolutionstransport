'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { Loader2, TruckIcon, User, Car, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'recipient' | 'driver' | 'dispatcher';

export default function OAuthRoleSelectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/sign-in');
        return;
      }

      setUserEmail(session.user.email || '');

      // Check if user already has a role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single();

      if (userData?.role) {
        // User already has a role, redirect to appropriate dashboard
        const redirectPath = userData.role === 'driver' 
          ? '/driver' 
          : userData.role === 'dispatcher' 
          ? '/dispatcher' 
          : '/customer/dashboard';
        router.push(redirectPath);
      }
    };

    checkAuth();
  }, [supabase, router]);

  const handleRoleSelection = async (role: UserRole) => {
    if (isLoading) return;

    setIsLoading(true);
    setSelectedRole(role);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Use server-side API to set role (has proper permissions via service role)
      const response = await fetch('/api/auth/ensure-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to set role');
      }

      const result = await response.json();
      const actualRole = result.role || role;

      toast.success('Account setup complete!', {
        description: `You're now registered as a ${actualRole === 'recipient' ? 'customer' : actualRole}`,
      });

      // Redirect based on actual role from server
      const redirectPath = actualRole === 'driver'
        ? '/driver'
        : actualRole === 'dispatcher'
        ? '/dispatcher'
        : '/customer/dashboard';

      router.push(redirectPath);
    } catch (error: any) {
      toast.error('Failed to set role', {
        description: error.message || 'Please try again',
      });
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TruckIcon className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-display font-semibold text-foreground mb-2">
            Complete Your Registration
          </h1>
          <p className="text-body text-muted-foreground">
            {userEmail && `Welcome, ${userEmail}! `}
            Please select how you'd like to use Preferred Solutions Transport
          </p>
        </div>

        <Card className="shadow-soft-lg">
          <CardHeader>
            <CardTitle>Choose Your Role</CardTitle>
            <CardDescription>
              Select the option that best describes how you'll be using our platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Card */}
              <button
                onClick={() => handleRoleSelection('recipient')}
                disabled={isLoading}
                className="relative group p-6 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && selectedRole === 'recipient' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <User className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Customer</h3>
                    <p className="text-sm text-muted-foreground">
                      Book and track deliveries
                    </p>
                  </div>
                </div>
              </button>

              {/* Driver Card */}
              <button
                onClick={() => handleRoleSelection('driver')}
                disabled={isLoading}
                className="relative group p-6 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && selectedRole === 'driver' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Car className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Driver</h3>
                    <p className="text-sm text-muted-foreground">
                      Accept and complete deliveries
                    </p>
                  </div>
                </div>
              </button>

              {/* Dispatcher Card */}
              <button
                onClick={() => handleRoleSelection('dispatcher')}
                disabled={isLoading}
                className="relative group p-6 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && selectedRole === 'dispatcher' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Dispatcher</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage and coordinate deliveries
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Note:</strong> You can contact support later if you need to change your role.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

