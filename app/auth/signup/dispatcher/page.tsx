'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { Mail, Loader2, TruckIcon, User, Lock, Chrome, Phone, Shield } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function DispatcherSignUpPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailPasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'dispatcher',
            phone: formData.phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?role=dispatcher`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create user record in public.users table
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            auth_id: data.user.id,
            email: formData.email,
            role: 'dispatcher',
          }, { onConflict: 'auth_id' });

        if (userError) console.error('Error creating user record:', userError);

        toast.success('Dispatcher account created!', {
          description: 'Please check your email to verify your account. Your account may require admin approval before you can access the system.',
        });
        
        // Redirect to sign-in after a short delay
        setTimeout(() => router.push('/auth/sign-in?role=dispatcher'), 2000);
      }
    } catch (error: any) {
      toast.error('Sign up failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=dispatcher`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error('Google sign up failed', {
        description: error.message || 'Please try again',
      });
      setIsLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=dispatcher`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error('Facebook sign up failed', {
        description: error.message || 'Please try again',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <TruckIcon className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-display font-semibold text-foreground mb-2">
            Create Dispatcher Account
          </h1>
          <p className="text-body text-muted-foreground">
            Join our operations team
          </p>
        </div>

        <Card className="shadow-soft-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Dispatcher Registration
            </CardTitle>
            <CardDescription>
              Create your dispatcher account to manage deliveries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Social Sign Up */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <Chrome className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleFacebookSignup}
                disabled={isLoading}
              >
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </Button>
            </div>

            <Separator className="my-6">
              <span className="px-2 text-xs text-muted-foreground bg-card">Or sign up with email</span>
            </Separator>

            {/* Email/Password Sign Up Form */}
            <form onSubmit={handleEmailPasswordSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pl-10"
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
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pl-10"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="pl-10"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Dispatcher accounts may require admin approval before full access is granted.
                </p>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Dispatcher Account'
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-3 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/sign-in?role=dispatcher" className="text-accent font-medium hover:underline">
                  Sign in
                </Link>
              </p>
              <p className="text-muted-foreground">
                Are you a customer?{' '}
                <Link href="/auth/signup/customer" className="text-accent font-medium hover:underline">
                  Customer sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

