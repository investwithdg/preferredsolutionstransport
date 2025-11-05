import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';
import { isMasterAccountEnabled } from '@/lib/config';

export async function POST(req: NextRequest) {
  if (!isMasterAccountEnabled()) {
    return NextResponse.json({ error: 'Master account login is disabled.' }, { status: 403 });
  }

  const email = process.env.MASTER_ACCOUNT_EMAIL;
  const password = process.env.MASTER_ACCOUNT_PASSWORD;

  if (!email || !password) {
    console.error('MASTER_ACCOUNT_EMAIL or MASTER_ACCOUNT_PASSWORD not set');
    return NextResponse.json({ error: 'Master account not configured.' }, { status: 500 });
  }

  const res = NextResponse.next();
  const supabase = createRouteHandlerClient(req, res);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Master account sign-in failed:', error);
    return NextResponse.json({ error: 'Master account sign-in failed.' }, { status: 401 });
  }

  if (data.user) {
    // The createRouteHandlerClient will set the session cookie on the response.
    // The client will then be authenticated for subsequent requests.
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', data.user.id)
      .single();

    const role = userRow?.role ?? 'recipient';

    const redirectPath =
      role === 'driver'
        ? '/driver'
        : (role === 'dispatcher' || role === 'admin')
        ? '/dispatcher'
        : '/customer/dashboard';

    return NextResponse.json({ redirectPath });
  }

  return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
}
