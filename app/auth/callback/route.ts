import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';
import { getBaseUrl } from '@/lib/auth-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get('code');
    const roleParam = requestUrl.searchParams.get('role'); // Get role from query param
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = process.env.NEXT_PUBLIC_SITE_URL || getBaseUrl();

    console.log('[Auth Callback Debug] Full URL:', requestUrl.toString());
    console.log('[Auth Callback Debug] Code:', code ? 'Present' : 'Missing');
    console.log('[Auth Callback Debug] Role:', roleParam);
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
          // Check if they came from a specific signup flow (role param in URL)
          if (roleParam && ['recipient', 'driver', 'dispatcher'].includes(roleParam)) {
            // Create user record with the specified role
            const { error: upsertError } = await service.from('users').upsert(
              {
                auth_id: authId,
                email: email,
                role: roleParam as 'recipient' | 'driver' | 'dispatcher',
              },
              { onConflict: 'auth_id' }
            );

            if (!upsertError) {
              userRole = roleParam as 'admin' | 'dispatcher' | 'driver' | 'recipient';

              // Create driver record if role is driver
              if (roleParam === 'driver') {
                await service.from('drivers').insert({
                  user_id: authId,
                  name: session.user.user_metadata?.name || email?.split('@')[0] || 'Driver',
                  phone: session.user.user_metadata?.phone || '',
                  vehicle_details: null,
                });
              }

              // Link customer record if role is recipient (no auth_email field needed)
              if (roleParam === 'recipient' && email) {
                // Customer record is already linked via email
                // No action needed
              }
            } else {
              // Failed to create user with role, redirect to role selection page
              console.error('[Auth Callback] Failed to set role:', upsertError);
              return NextResponse.redirect(`${origin}/auth/oauth-role-select`);
            }
          } else {
            // No role specified, redirect to role selection page
            return NextResponse.redirect(`${origin}/auth/oauth-role-select`);
          }
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
