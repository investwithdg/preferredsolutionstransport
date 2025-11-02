import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get('code');
    const roleParam = requestUrl.searchParams.get('role'); // Get role from query param
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

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
      // Create a next() response to allow cookie mutations during auth exchange
      const res = NextResponse.next();
      const supabase = createRouteHandlerClient(req, res);
      
      console.log('[Auth Callback Debug] Exchanging code for session...');
      // Exchange code for session - this will set cookies on the res object
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('[Auth Callback Debug] Code exchange error:', exchangeError);
        console.error('[Auth Callback Debug] Error details:', {
          message: exchangeError.message,
          status: exchangeError.status,
          name: exchangeError.name
        });
        const errorRedirectUrl = new URL(`/auth/sign-in?error=auth_failed&message=${encodeURIComponent(exchangeError.message)}`, origin);
        const errorRes = NextResponse.redirect(errorRedirectUrl);
        
        // Copy all cookies that were set during auth exchange
        res.cookies.getAll().forEach(cookie => {
          errorRes.cookies.set(cookie);
        });
        
        return errorRes;
      }

      console.log('[Auth Callback Debug] Session data:', session ? 'Session exists' : 'No session');
      
      if (session?.user) {
        console.log('[Auth Callback Debug] Session user found:', session.user.id, session.user.email);
        
        const service = createServiceRoleClient();
        const email = session.user.email;
        const authId = session.user.id;

        // Check if user already has a role in the database
        console.log('[Auth Callback Debug] Checking for existing user role...');
        const { data: existingUser, error: userFetchError } = await service
          .from('users')
          .select('role')
          .eq('auth_id', authId)
          .single();
        
        if (userFetchError && userFetchError.code !== 'PGRST116') {
          // PGRST116 is "not found", which is expected for new users
          console.error('[Auth Callback Debug] Error fetching user:', userFetchError);
        }
        
        console.log('[Auth Callback Debug] Existing user role:', existingUser?.role || 'none');

        let userRole = existingUser?.role;

        // If user doesn't have a role yet
        if (!userRole) {
          console.log('[Auth Callback Debug] No existing role, roleParam:', roleParam);
          
          // Check if they came from a specific signup flow (role param in URL)
          if (roleParam && ['recipient', 'driver', 'dispatcher'].includes(roleParam)) {
            console.log('[Auth Callback Debug] Creating user with role:', roleParam);
            
            // Create user record with the specified role
            const { error: upsertError } = await service
              .from('users')
              .upsert({
                auth_id: authId,
                email: email,
                role: roleParam as 'recipient' | 'driver' | 'dispatcher',
              }, { onConflict: 'auth_id' });

            if (upsertError) {
              console.error('[Auth Callback Debug] Error creating user record:', upsertError);
            } else {
              console.log('[Auth Callback Debug] User record created successfully');
              userRole = roleParam as 'admin' | 'dispatcher' | 'driver' | 'recipient';

              // Create driver record if role is driver
              if (roleParam === 'driver') {
                console.log('[Auth Callback Debug] Creating driver record...');
                const { error: driverError } = await service.from('drivers').insert({
                  user_id: authId,
                  name: session.user.user_metadata?.name || email?.split('@')[0] || 'Driver',
                  phone: session.user.user_metadata?.phone || '',
                  vehicle_details: null,
                });
                
                if (driverError) {
                  console.error('[Auth Callback Debug] Error creating driver record:', driverError);
                } else {
                  console.log('[Auth Callback Debug] Driver record created successfully');
                }
              }

              // Link customer record if role is recipient (no auth_email field needed)
              if (roleParam === 'recipient' && email) {
                console.log('[Auth Callback Debug] Recipient role - customer linked via email');
              }
            }
          } else {
            // No role specified, redirect to role selection page
            console.log('[Auth Callback Debug] No role param, redirecting to role selection');
            const roleSelectUrl = new URL('/auth/oauth-role-select', origin);
            const roleSelectRes = NextResponse.redirect(roleSelectUrl);
            
            // Copy all cookies from the original response to preserve session
            res.cookies.getAll().forEach(cookie => {
              roleSelectRes.cookies.set(cookie);
            });
            
            return roleSelectRes;
          }
        }

        // Ensure user record exists (for existing users)
        if (email && userRole) {
          console.log('[Auth Callback Debug] Upserting user record for existing user');
          const { error: upsertExistingError } = await service
            .from('users')
            .upsert({ auth_id: authId, email, role: userRole }, { onConflict: 'auth_id' });
          
          if (upsertExistingError) {
            console.error('[Auth Callback Debug] Error upserting existing user:', upsertExistingError);
          }
        }

        // Customer record is linked via email (no auth_email field in schema)
        // No additional action needed for recipients

        // Determine redirect path based on user role
        let redirectPath = '/customer/dashboard';
        if (userRole === 'driver') {
          redirectPath = '/driver';
        } else if (userRole === 'dispatcher' || userRole === 'admin') {
          redirectPath = '/dispatcher';
        } else if (userRole === 'recipient') {
          redirectPath = '/customer/dashboard';
        }

        console.log('[Auth Callback Debug] Redirecting to:', redirectPath, 'for role:', userRole);

        // Create redirect response with the correct path
        const redirectUrl = new URL(redirectPath, origin);
        const redirectRes = NextResponse.redirect(redirectUrl);
        
        // Copy all session cookies from the auth exchange to the redirect response
        res.cookies.getAll().forEach(cookie => {
          redirectRes.cookies.set(cookie);
        });

        
        return redirectRes;
      } else {
        console.error('[Auth Callback Debug] No session user after exchange - this should not happen');
        return NextResponse.redirect(`${origin}/auth/sign-in?error=no_session`);
      }
    }

    // No code parameter, redirect to sign-in
    console.log('[Auth Callback Debug] No code parameter, redirecting to sign-in');
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  } catch (error) {
    console.error('[Auth Callback Debug] Unexpected error:', error);
    console.error('[Auth Callback Debug] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Try to get origin from request
    let origin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      try {
        const requestUrl = new URL(req.url);
        origin = requestUrl.origin;
      } catch (e) {
        // Fallback if URL parsing fails
        origin = 'http://localhost:3000';
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Callback Debug] Redirecting to sign-in with error:', errorMessage);
    
    return NextResponse.redirect(`${origin}/auth/sign-in?error=unexpected&message=${encodeURIComponent(errorMessage)}`);
  }
}


