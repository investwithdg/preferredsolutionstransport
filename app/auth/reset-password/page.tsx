'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl } from '@/lib/auth-helpers';
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
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAuthRedirectUrl('/auth/callback')}?reset=true`,
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
      toast.success('Password reset email sent', {
        description: 'Check your inbox for instructions to reset your password.',
      });
    } catch (error: any) {
      console.error('[Reset Password] Error:', error);
      toast.error('Unable to send reset email', {
        description: error.message || 'Please try again or contact support.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-display font-semibold text-foreground mb-2">Reset Password</h1>
          <p className="text-body text-muted-foreground">
            Enter the email associated with your account and we&apos;ll send instructions to reset
            your password.
          </p>
        </div>

        <Card className="shadow-soft-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" />
              Send reset instructions
            </CardTitle>
            <CardDescription>
              We&apos;ll send a secure link to help you set a new password.
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
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading || isSent}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full"
                disabled={isLoading || isSent}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending instructions...
                  </>
                ) : (
                  'Send reset email'
                )}
              </Button>

              {isSent && (
                <p className="text-xs text-muted-foreground text-center">
                  Email sent to <span className="font-medium text-foreground">{email}</span>. Please
                  follow the instructions to create a new password.
                </p>
              )}
            </form>

            <Separator className="my-6" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 hover:text-accent transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
              <a href="/auth/sign-in" className="hover:text-accent font-medium transition-colors">
                Return to sign in
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
