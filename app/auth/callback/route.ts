import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

const emailSchema = z.string().email();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = emailSchema.parse(formData.get('email'));

    const supabase = createServerClient();
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.redirect(`${origin}/auth/sign-in?sent=1`);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Supabase will redirect back here with a code to set the session cookie
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.getSession();
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '/';

    if (error) {
      return NextResponse.redirect(`${origin}/auth/sign-in?error=1`);
    }

    const session = data.session;
    if (session?.user) {
      // Ensure public.users record exists and link driver if applicable
      const service = createServiceRoleClient();
      const email = session.user.email || undefined;
      const authId = session.user.id;

      if (email) {
        await service.from('users').upsert({ auth_id: authId, email }, { onConflict: 'auth_id' });
        // optional: link customers.auth_email
        await service.from('customers').update({ auth_email: email }).eq('email', email);
      }

      // If this auth user corresponds to a driver by email, and driver has null user_id, link it
      if (email) {
        await service
          .from('drivers')
          .update({ user_id: authId })
          .is('user_id', null)
          .eq('phone', null) // no-op filter to avoid mass updates; remove or adjust as needed
          .limit(0);
      }
    }

    // Decide post-login redirect based on role if available
    // Default to dispatcher for now if admin/dispatcher, else driver
    const roleRes = await createServiceRoleClient()
      .from('users')
      .select('role')
      .eq('auth_id', data.session?.user.id || '')
      .single();

    const role = roleRes.data?.role;

    const next = role === 'driver' ? '/driver' : '/dispatcher';
    return NextResponse.redirect(new URL(next, req.url));
  } catch (e) {
    return NextResponse.redirect(new URL('/auth/sign-in?error=1', req.url));
  }
}


