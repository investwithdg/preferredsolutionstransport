'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';
import { Mail, Loader2, TruckIcon, CheckCircle2, Lock, Chrome, Car, Shield, User } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type AuthMode = 'magic-link' | 'password';
type UserRole = 'recipient' | 'driver' | 'dispatcher';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [selectedRole, setSelectedRole] = useState<UserRole>('recipient');

  // Get role from URL if present
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'driver' || roleParam === 'dispatcher' || roleParam === 'recipient') {
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

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
        toast.success('Sign in successful!');
        
        // Redirect based on role
        const redirectPath = selectedRole === 'driver' 
          ? '/driver' 
          : selectedRole === 'dispatcher' 
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

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success('Magic link sent!', {
        description: 'Check your email for the login link',
      });
    } catch (error: any) {
      toast.error('Something went wrong', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error('Google sign in failed', {
        description: error.message || 'Please try again',
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
          redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
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

  const handleSubmit = authMode === 'password' ? handlePasswordSignIn : handleMagicLinkSignIn;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md" data-testid="sign-in-page">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TruckIcon className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-display font-semibold text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-body text-muted-foreground">
            Sign in to Preferred Solutions Transport
          </p>
        </div>

        {!isSuccess ? (
          <Card className="shadow-soft-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent" />
                Secure Sign In
              </CardTitle>
              <CardDescription>
                Sign in with your credentials or use social login
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Role Selector */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="role">I am signing in as a</Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
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
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </Button>
              </div>

              <Separator className="my-6">
                <span className="px-2 text-xs text-muted-foreground bg-card">Or continue with</span>
              </Separator>

              {/* Auth Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={authMode === 'password' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAuthMode('password')}
                >
                  Password
                </Button>
                <Button
                  type="button"
                  variant={authMode === 'magic-link' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAuthMode('magic-link')}
                >
                  Magic Link
                </Button>
              </div>

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

                {authMode === 'password' && (
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
                )}

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
                      {authMode === 'password' ? 'Signing in...' : 'Sending Magic Link...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'password' ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Magic Link
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>

              <Separator className="my-6" />

              <div className="space-y-3 text-center text-sm">
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <a href={`/auth/signup/${selectedRole === 'recipient' ? 'customer' : selectedRole}`} className="text-accent font-medium hover:underline">
                    Sign up
                  </a>
                </p>
                <p className="text-muted-foreground">
                  Need help?{' '}
                  <a href="mailto:support@preferredsolutions.com" className="text-accent font-medium hover:underline">
                    Contact support
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-soft-lg border-success/20 bg-success/5">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-heading-lg font-semibold mb-2">Check Your Email</h2>
              <p className="text-body text-muted-foreground mb-6">
                We've sent a magic link to <strong>{email}</strong>. 
                Click the link in the email to sign in.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => setIsSuccess(false)}
                  variant="outline"
                  className="w-full"
                >
                  Use a different email
                </Button>
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">Secure</p>
          </div>
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <p className="text-xs text-muted-foreground">No Password</p>
          </div>
          <div>
            <div className="mx-auto w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
              <Mail className="h-5 w-5 text-warning" />
            </div>
            <p className="text-xs text-muted-foreground">Email Only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
