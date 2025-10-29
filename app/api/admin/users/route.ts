import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Fetch all users with their roles and activity stats
 */
export async function GET() {
  try {
    const cookieClient = await createServerClient();

    // Verify admin access
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole } = await cookieClient
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role client to fetch all users
    const supabase = createServiceRoleClient();

    // Fetch all users from public.users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch auth metadata for each user
    const {
      data: { users: authUsers },
      error: authError,
    } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    // Merge auth data with public users data
    const enrichedUsers = users?.map((user) => {
      const authUser = authUsers?.find((au) => au.id === user.auth_id);

      return {
        ...user,
        email_confirmed: authUser?.email_confirmed_at ? true : false,
        last_sign_in_at: authUser?.last_sign_in_at,
        created_at_auth: authUser?.created_at,
        banned: (authUser as any)?.ban_duration ? true : false,
      };
    });

    return NextResponse.json({ users: enrichedUsers || [] });
  } catch (error: any) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user with specified role
 */
export async function POST(request: NextRequest) {
  try {
    const cookieClient = await createServerClient();

    // Verify admin access
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole } = await cookieClient
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, role, name } = body;

    // Validate input
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'dispatcher', 'driver', 'recipient'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Use service role client to create auth user
    const supabase = createServiceRoleClient();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { name: name || email.split('@')[0] },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user', details: authError?.message },
        { status: 500 }
      );
    }

    // Create user record in public.users
    const { error: userError } = await supabase.from('users').insert({
      auth_id: authData.user.id,
      email: email,
      role: role,
    });

    if (userError) {
      console.error('Error creating user record:', userError);

      // Cleanup: delete auth user if public.users insert failed
      await supabase.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: 'Failed to create user record', details: userError.message },
        { status: 500 }
      );
    }

    // If role is driver, create driver record
    if (role === 'driver') {
      const { error: driverError } = await supabase.from('drivers').insert({
        user_id: authData.user.id,
        name: name || email.split('@')[0],
        phone: '',
        vehicle_details: null,
      });

      if (driverError) {
        console.error('Error creating driver record:', driverError);
        // Don't fail the whole operation, just log the error
      }
    }

    // If role is recipient, they'll be linked to customer records via email

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: email,
        role: role,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update user role or status
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieClient = await createServerClient();

    // Verify admin access
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole } = await cookieClient
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userId, role, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Handle different actions
    if (action === 'ban') {
      // Ban user in auth
      const { error: banError } = await supabase.auth.admin.updateUserById(
        userId,
        { ban_duration: '876000h' } // ~100 years effectively permanent
      );

      if (banError) {
        return NextResponse.json(
          { error: 'Failed to ban user', details: banError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'User banned' });
    }

    if (action === 'unban') {
      // Unban user in auth
      const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      });

      if (unbanError) {
        return NextResponse.json(
          { error: 'Failed to unban user', details: unbanError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'User unbanned' });
    }

    if (role) {
      // Update role in public.users
      if (!['admin', 'dispatcher', 'driver', 'recipient'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const { error: roleError } = await supabase
        .from('users')
        .update({ role })
        .eq('auth_id', userId);

      if (roleError) {
        return NextResponse.json(
          { error: 'Failed to update role', details: roleError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Role updated' });
    }

    return NextResponse.json({ error: 'No valid action or role provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user (soft delete - bans them)
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieClient = await createServerClient();

    // Verify admin access
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole } = await cookieClient
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Soft delete by banning the user
    const { error: deleteError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '876000h',
    });

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete user', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
