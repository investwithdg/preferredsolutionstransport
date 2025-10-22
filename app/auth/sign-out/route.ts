import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  const supabase = createRouteHandlerClient(req, res);
  await supabase.auth.signOut();
  return res;
}


