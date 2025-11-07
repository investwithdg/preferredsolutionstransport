import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';
import { getBaseUrl } from '@/lib/auth-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = process.env.NEXT_PUBLIC_SITE_URL || getBaseUrl();

    console.log('[Auth Callback Debug] Full URL:', requestUrl.toString());
    console.log('[Auth Callback Debug] Code:', code ? 'Present' : 'Missing');
    console.log('[Auth Callback Debug] Error:', error);
    console.log('[Auth Callback Debug] Error Description:', errorDescription);
    console.log('[Auth Callback Debug] Origin:', origin);

    // Handle OAuth errors from provider
    if (error) {
      console.error('[Auth Callback Debug] OAuth provider error:', error, errorDescription);
      const errorMessage = encodeURIComponent(errorDescription || 'Authentication failed');
      return NextResponse.redirect(`${origin}/auth/sign-in?error=${error}&message=${errorMessage}`);
    }

    if (code) {
      const res = NextResponse.next();
      const supabase = createRouteHandlerClient(req, res);

      console.log('[Auth Callback Debug] Exchanging code for session...');
      // Exchange code for session
      const {
        data: { session },
        error: exchangeError,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[Auth Callback Debug] Code exchange error:', exchangeError);
        console.error('[Auth Callback Debug] Error details:', {
          message: exchangeError.message,
          status: exchangeError.status,
          name: exchangeError.name,
        });
        return NextResponse.redirect(
          `${origin}/auth/sign-in?error=auth_failed&message=${encodeURIComponent(exchangeError.message)}`
        );
      }

      if (session?.user) {
        const service = createServiceRoleClient();
        const email = session.user.email;
        const authId = session.user.id;

        // Check if user already has a role in the database
        const { data: existingUser } = await service
          .from('users')
          .select('role')
          .eq('auth_id', authId)
          .single();

        let userRole = existingUser?.role;

        // If user doesn't have a role yet
        if (!userRole) {
          // Redirect to role selection page
          return NextResponse.redirect(`${origin}/auth/role-select`);
        }

        // Ensure user record exists (for existing users)
        if (email && userRole) {
          await service
            .from('users')
            .upsert({ auth_id: authId, email, role: userRole }, { onConflict: 'auth_id' });
        }

        // Customer record is linked via email (no auth_email field in schema)
        // No additional action needed for recipients

        // Redirect based on user role
        let redirectPath = '/customer/dashboard';

        if (userRole === 'driver') {
          redirectPath = '/driver';
        } else if (userRole === 'dispatcher' || userRole === 'admin') {
          redirectPath = '/dispatcher';
        } else if (userRole === 'recipient') {
          redirectPath = '/customer/dashboard';
        }

        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }

    // No code parameter, redirect to sign-in
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  } catch (error) {
    console.error('Auth callback error:', error);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.url;
    return NextResponse.redirect(`${origin}/auth/sign-in?error=unexpected`);
  }
}
