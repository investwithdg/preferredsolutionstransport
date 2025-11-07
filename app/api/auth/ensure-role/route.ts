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
  console.log('[ensure-role] POST request received');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[ensure-role] Missing required environment variables', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const cookieClient = createRouteHandlerClient(req, res);
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session?.user) {
      console.error('[ensure-role] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ensure-role] Session found for user:', session.user.id);

    const body = await req.json().catch(() => ({}));
    const requestedRole = body?.role as 'recipient' | 'driver' | 'dispatcher' | undefined;

    console.log('[ensure-role] Requested role:', requestedRole);

    const service = createServiceRoleClient();

    // Check for existing user record
    const { data: existing, error: selectErr } = await service
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (selectErr) {
      console.error('[ensure-role] select error', selectErr);
      return NextResponse.json({ error: 'Database error', details: selectErr.message }, { status: 500 });
    }

    console.log('[ensure-role] Existing user record:', existing);

    let finalRole = existing?.role as 'admin' | 'dispatcher' | 'driver' | 'recipient' | null;

    // If a role was requested AND user doesn't have a role yet, create it
    if (requestedRole && !finalRole) {
      finalRole =
        requestedRole === 'driver' ||
        requestedRole === 'dispatcher' ||
        requestedRole === 'recipient'
          ? requestedRole
          : 'recipient';

      console.log('[ensure-role] Creating user record with role:', finalRole);

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
        return NextResponse.json({ error: 'Failed to set role', details: upsertErr.message }, { status: 500 });
      }

      console.log('[ensure-role] User record created:', userRecord?.id);

      // If driver, ensure a driver record exists
      if (finalRole === 'driver' && userRecord?.id) {
        // First check if driver record already exists
        const { data: existingDriver } = await service
          .from('drivers')
          .select('id')
          .eq('user_id', userRecord.id)
          .maybeSingle();

        if (!existingDriver) {
          // Only insert if driver record doesn't exist
          const { error: driverInsertErr } = await service
            .from('drivers')
            .insert({
              user_id: userRecord.id, // Use public.users.id, not auth.users.id
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Driver',
              phone: session.user.user_metadata?.phone || '',
              vehicle_details: null,
            });

          if (driverInsertErr) {
            console.error('[ensure-role] driver insert error', driverInsertErr);
            // Don't fail the whole request if driver creation fails
            // The user record was created successfully
          }
        } else {
          console.log('[ensure-role] driver record already exists for user', userRecord.id);
        }
      }
    }

    // Return the role (existing or newly created)
    console.log('[ensure-role] Returning success with role:', finalRole);
    return NextResponse.json({ ok: true, role: finalRole });
  } catch (err) {
    console.error('[ensure-role] unexpected error', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Unexpected error', details: errorMessage }, { status: 500 });
  }
}
