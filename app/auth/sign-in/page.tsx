'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { Mail, Loader2, TruckIcon, Lock, Chrome, Car, Shield, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl } from '@/lib/auth-helpers';
import { isMasterAccountEnabled } from '@/lib/config';

type UserRole = 'recipient' | 'driver' | 'dispatcher' | 'admin';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('recipient');
  const showMasterAccount = isMasterAccountEnabled();

  // Get role from URL if present
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (
      roleParam === 'driver' ||
      roleParam === 'dispatcher' ||
      roleParam === 'recipient' ||
      roleParam === 'admin'
    ) {
      setSelectedRole(roleParam);
    }

    // Check for auth errors from callback
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      console.error('[Sign In Debug] Auth error from callback:', error, message);

      // Display user-friendly error messages
      if (error === 'auth_failed') {
        toast.error('Authentication failed', {
          description: message || 'Unable to sign in with Google. Please try again.',
        });
      } else if (error === 'access_denied') {
        toast.error('Access denied', {
          description: 'You cancelled the sign-in process.',
        });
      } else if (error === 'server_error') {
        toast.error('Server error', {
          description:
            'There was a problem with the authentication server. Please try again later.',
        });
      } else {
        toast.error('Sign in failed', {
          description: message || 'An unexpected error occurred. Please try again.',
        });
      }
    }
  }, [searchParams]);

  const handleMasterAccountSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/master-login', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Master account sign-in failed');
      }

      toast.success('Sign in successful!');
      router.push(data.redirectPath || '/');
      router.refresh(); // to ensure layout re-renders with new session
    } catch (error: any) {
      toast.error('Sign in failed', {
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Ensure role record exists on the server and get the ACTUAL role
        let actualRole = selectedRole;
        try {
          const response = await fetch('/api/auth/ensure-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: selectedRole }),
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            // Use the actual role from the database, not the selected role
            actualRole = result.role || selectedRole;
          }
        } catch (e) {
          // Non-fatal - continue with redirect using selected role
          console.warn('[Sign In] ensure-role call failed', e);
        }

        toast.success('Sign in successful!');

        // Redirect based on ACTUAL role from database (not selected role)
        const redirectPath =
          actualRole === 'driver'
            ? '/driver'
            : actualRole === 'dispatcher' || actualRole === 'admin'
              ? '/dispatcher'
              : '/customer/dashboard';

        router.push(redirectPath);
      }
    } catch (error: any) {
      toast.error('Sign in failed', {
        description: error.message || 'Please check your credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAuthRedirectUrl('/auth/callback')}?role=${selectedRole}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      // More detailed error messages
      let errorMessage = 'Please try again';
      if (error.message?.includes('OAuth')) {
        errorMessage = 'OAuth is not properly configured. Please check Supabase settings.';
      } else if (error.message?.includes('redirect')) {
        errorMessage = 'Invalid redirect URL configuration.';
      }

      toast.error('Google sign in failed', {
        description: error.message || errorMessage,
      });
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${getAuthRedirectUrl('/auth/callback')}?role=${selectedRole}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error('Facebook sign in failed', {
        description: error.message || 'Please try again',
      });
      setIsLoading(false);
    }
  };
  const handleSubmit = handlePasswordSignIn;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md" data-testid="sign-in-page">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TruckIcon className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-display font-semibold text-foreground mb-2">Welcome Back</h1>
          <p className="text-body text-muted-foreground">
            Sign in to Preferred Solutions Transport
          </p>
        </div>

        <Card className="shadow-soft-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-accent" />
              Secure Sign In
            </CardTitle>
            <CardDescription>
              Sign in with your password or continue with a connected provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showMasterAccount && (
              <>
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleMasterAccountSignIn}
                    disabled={isLoading}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Sign In as Master Account
                  </Button>
                </div>
                <Separator className="my-6">
                  <span className="px-2 text-xs text-muted-foreground bg-card">
                    Or sign in manually
                  </span>
                </Separator>
              </>
            )}
            {/* Role Selector */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="role">I am signing in as a</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recipient">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Customer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="driver">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>Driver</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dispatcher">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Dispatcher</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Social Sign In */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleFacebookSignIn}
                disabled={isLoading}
              >
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </Button>
            </div>

            <Separator className="my-6">
              <span className="px-2 text-xs text-muted-foreground bg-card">
                Or sign in with email
              </span>
            </Separator>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full"
                disabled={isLoading}
                data-testid="submit-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <a
                  href="/auth/reset-password"
                  className="hover:text-accent font-medium transition-colors"
                >
                  Forgot password?
                </a>
                <a
                  href={`/auth/signup/${selectedRole === 'recipient' ? 'customer' : selectedRole}`}
                  className="hover:text-accent font-medium transition-colors"
                >
                  Need an account?
                </a>
              </div>
            </form>

            <Separator className="my-6" />

            <div className="space-y-3 text-center text-sm">
              <p className="text-muted-foreground">
                Need access to another portal?{' '}
                <a
                  href="mailto:support@preferredsolutions.com"
                  className="text-accent font-medium hover:underline"
                >
                  Contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">Secure Access</p>
          </div>
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
              <Chrome className="h-5 w-5 text-success" />
            </div>
            <p className="text-xs text-muted-foreground">Google & Facebook</p>
          </div>
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
              <Mail className="h-5 w-5 text-warning" />
            </div>
            <p className="text-xs text-muted-foreground">Email Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
}
