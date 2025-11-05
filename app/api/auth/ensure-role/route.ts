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
    // Validate environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[ensure-role] SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json({
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set'
      }, { status: 500 });
    }

    const cookieClient = createRouteHandlerClient(req, res);
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session?.user) {
      console.log('[ensure-role] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ensure-role] Processing request for user:', session.user.id);

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
      console.error('[ensure-role] select error details:', {
        message: selectErr.message,
        details: selectErr.details,
        hint: selectErr.hint,
        code: selectErr.code,
      });
      return NextResponse.json({
        error: 'Database error',
        details: selectErr.message
      }, { status: 500 });
    }

    console.log('[ensure-role] Existing user record:', existing);

    let finalRole = existing?.role as 'admin' | 'dispatcher' | 'driver' | 'recipient' | null;

    // If no role on record yet, set it from request (default to recipient if invalid)
    if (!finalRole) {
      finalRole =
        requestedRole === 'driver' ||
        requestedRole === 'dispatcher' ||
        requestedRole === 'recipient'
          ? requestedRole
          : 'recipient';

      console.log('[ensure-role] Creating user record with role:', finalRole);

      const { data: userData, error: upsertErr } = await service.from('users').upsert(
        {
          auth_id: session.user.id,
          email: session.user.email,
          role: finalRole,
        },
        { onConflict: 'auth_id' }
      ).select('id').single();

      if (upsertErr) {
        console.error('[ensure-role] upsert error details:', {
          message: upsertErr.message,
          details: upsertErr.details,
          hint: upsertErr.hint,
          code: upsertErr.code,
        });
        return NextResponse.json({
          error: 'Failed to set role',
          details: upsertErr.message
        }, { status: 500 });
      }

      console.log('[ensure-role] User record created successfully with ID:', userData.id);

      // If driver, ensure a driver record exists using public.users.id
      if (finalRole === 'driver') {
        const { error: driverInsertErr } = await service
          .from('drivers')
          .insert({
            user_id: userData.id, // Use public.users.id, not auth.users.id
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Driver',
            phone: session.user.user_metadata?.phone || '',
            vehicle_details: null,
          })
          .select()
          .single();

        // Ignore duplicate key errors (unique user_id)
        if (driverInsertErr && !String(driverInsertErr.message).includes('duplicate')) {
          console.warn('[ensure-role] driver insert warning', driverInsertErr);
        } else {
          console.log('[ensure-role] Driver record created successfully');
        }
      }
    }

    return NextResponse.json({ ok: true, role: finalRole });
  } catch (err) {
    console.error('[ensure-role] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
