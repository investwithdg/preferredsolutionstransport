'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { Mail, Loader2, TruckIcon, CheckCircle2, Lock } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      // In production, this would call Supabase auth.signInWithOtp
      const response = await fetch('/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSuccess(true);
        toast.success('Magic link sent!', {
          description: 'Check your email for the login link',
        });
      } else {
        throw new Error('Failed to send magic link');
      }
    } catch (error) {
      toast.error('Something went wrong', {
        description: 'Please try again or contact support',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                Enter your email to receive a magic link. No password needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      Sending Magic Link...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Magic Link
                    </>
                  )}
                </Button>
              </form>

              <Separator className="my-6" />

              <div className="space-y-3 text-center text-sm">
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <a href="/quote" className="text-accent font-medium hover:underline">
                    Request a quote
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
