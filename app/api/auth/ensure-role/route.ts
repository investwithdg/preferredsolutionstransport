import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';

export const runtime = 'nodejs';

/**
 * POST /api/auth/ensure-role
 * Dual purpose endpoint:
 * - When called WITHOUT body.role: Only checks and returns existing role (used by sign-in)
 * - When called WITH body.role: Creates/updates the role (used by role-select page)
 * Body (optional): { role: 'recipient' | 'driver' | 'dispatcher' }
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

    // If a role was requested AND user doesn't have a role yet, create it
    if (requestedRole && !finalRole) {
      finalRole =
        requestedRole === 'driver' ||
        requestedRole === 'dispatcher' ||
        requestedRole === 'recipient'
          ? requestedRole
          : 'recipient';

      const { data: userRecord, error: upsertErr } = await service
        .from('users')
        .upsert(
          {
            auth_id: session.user.id,
            email: session.user.email,
            role: finalRole,
          },
          { onConflict: 'auth_id' }
        )
        .select()
        .single();

      if (upsertErr) {
        console.error('[ensure-role] upsert error', upsertErr);
        return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
      }

      // If driver, ensure a driver record exists
      if (finalRole === 'driver' && userRecord?.id) {
        const { error: driverInsertErr } = await service
          .from('drivers')
          .insert({
            user_id: userRecord.id, // Use public.users.id, not auth.users.id
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

    // Return the role (existing or newly created)
    return NextResponse.json({ ok: true, role: finalRole });
  } catch (err) {
    console.error('[ensure-role] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
