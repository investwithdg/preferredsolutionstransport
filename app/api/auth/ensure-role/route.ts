import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';

export const runtime = 'nodejs';

/**
 * POST /api/auth/ensure-role
 * Ensures the authenticated user has a role record in public.users.
 * If absent, creates one using the provided role.
 * Body: { role: 'recipient' | 'driver' | 'dispatcher' }
 */
export async function POST(req: NextRequest) {
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
    const requestedRole = body?.role as 'recipient' | 'driver' | 'dispatcher' | undefined;

    const service = createServiceRoleClient();

    // Check for existing user record
    const { data: existing, error: selectErr } = await service
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (selectErr) {
      console.error('[ensure-role] select error', selectErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let finalRole = existing?.role as 'admin' | 'dispatcher' | 'driver' | 'recipient' | null;

    // If no role on record yet, set it from request (default to recipient if invalid)
    if (!finalRole) {
      finalRole =
        requestedRole === 'driver' ||
        requestedRole === 'dispatcher' ||
        requestedRole === 'recipient'
          ? requestedRole
          : 'recipient';

      const { error: upsertErr } = await service.from('users').upsert(
        {
          auth_id: session.user.id,
          email: session.user.email,
          role: finalRole,
        },
        { onConflict: 'auth_id' }
      );

      if (upsertErr) {
        console.error('[ensure-role] upsert error', upsertErr);
        return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
      }

      // If driver, ensure a driver record exists
      if (finalRole === 'driver') {
        const { error: driverInsertErr } = await service
          .from('drivers')
          .insert({
            user_id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Driver',
            phone: session.user.user_metadata?.phone || '',
            vehicle_details: null,
          })
          .select()
          .single();

        // Ignore duplicate key errors (unique user_id)
        if (driverInsertErr && !String(driverInsertErr.message).includes('duplicate')) {
          console.warn('[ensure-role] driver insert warning', driverInsertErr);
        }
      }
    }

    return NextResponse.json({ ok: true, role: finalRole });
  } catch (err) {
    console.error('[ensure-role] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
