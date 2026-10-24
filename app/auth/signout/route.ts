import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isDemo, writeDemo } from '@/lib/demo';

export async function POST(request: NextRequest) {
  if (isDemo()) {
    await writeDemo(null);
  } else {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
