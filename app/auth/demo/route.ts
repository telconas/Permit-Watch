import { NextResponse, type NextRequest } from 'next/server';
import { isDemo, readDemo, writeDemo } from '@/lib/demo';

// Demo-mode sign-in: no email, just a cookie.
export async function POST(request: NextRequest) {
  if (!isDemo()) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  await writeDemo({ signedIn: true });
  const current = await readDemo();
  const form = await request.formData();
  const raw = String(form.get('next') ?? '');
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  return NextResponse.redirect(new URL(current.trade ? next : '/onboarding', request.url), { status: 303 });
}
