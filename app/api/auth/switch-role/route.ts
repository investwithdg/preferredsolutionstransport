import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';
import { isMasterAccountEnabled } from '@/lib/config';

export const runtime = 'nodejs';

/**
 * POST /api/auth/switch-role
 * FOR TESTING ONLY: Allows switching user role
 * Body: { role: 'recipient' | 'driver' | 'dispatcher' | 'admin' }
 */
export async function POST(req: NextRequest) {
  if (!isMasterAccountEnabled()) {
    return NextResponse.json({ error: 'This feature is disabled' }, { status: 403 });
  }

  const res = NextResponse.next();
  try {
    const cookieClient = createRouteHandlerClient(req, res);
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const newRole = body?.role as 'recipient' | 'driver' | 'dispatcher' | 'admin' | undefined;

    if (!newRole || !['recipient', 'driver', 'dispatcher', 'admin'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const service = createServiceRoleClient();

    // Update the user's role
    const { data: updatedUser, error: updateErr } = await service
      .from('users')
      .update({ role: newRole })
      .eq('auth_id', session.user.id)
      .select('id')
      .single();

    if (updateErr) {
      console.error('[switch-role] update error', updateErr);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    // If switching to driver, ensure a driver record exists
    if (newRole === 'driver' && updatedUser?.id) {
      const { error: driverInsertErr } = await service
        .from('drivers')
        .insert({
          user_id: updatedUser.id, // Use public.users.id, not auth.users.id
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Driver',
          phone: session.user.user_metadata?.phone || '',
          vehicle_details: null,
        })
        .select()
        .single();

      // Ignore duplicate key errors (unique user_id)
      if (driverInsertErr && !String(driverInsertErr.message).includes('duplicate')) {
        console.warn('[switch-role] driver insert warning', driverInsertErr);
      }
    }

    return NextResponse.json({ ok: true, role: newRole });
  } catch (err) {
    console.error('[switch-role] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
