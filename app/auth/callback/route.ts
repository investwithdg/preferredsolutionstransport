import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get('code');
    const roleParam = requestUrl.searchParams.get('role'); // Get role from query param
    const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

    if (code) {
      const supabase = createServerClient();
      
      // Exchange code for session
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_failed`);
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
            const { error: upsertError } = await service
              .from('users')
              .upsert({
                auth_id: authId,
                email: email,
                role: roleParam as 'recipient' | 'driver' | 'dispatcher',
              }, { onConflict: 'auth_id' });

            if (!upsertError) {
              userRole = roleParam;

              // Create driver record if role is driver
              if (roleParam === 'driver') {
                await service.from('drivers').insert({
                  user_id: authId,
                  name: session.user.user_metadata?.name || email?.split('@')[0] || 'Driver',
                  phone: session.user.user_metadata?.phone || null,
                  vehicle_details: {},
                });
              }

              // Link customer record if role is recipient
              if (roleParam === 'recipient' && email) {
                await service
                  .from('customers')
                  .update({ auth_email: email })
                  .eq('email', email);
              }
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

        // Link customer auth_email if recipient
        if (userRole === 'recipient' && email) {
          await service
            .from('customers')
            .update({ auth_email: email })
            .eq('email', email);
        }

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


