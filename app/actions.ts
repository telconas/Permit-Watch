'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isTrade } from '@/lib/trades';
import { isDemo, writeDemo } from '@/lib/demo';

export async function saveSetup(formData: FormData) {
  const { user } = await requireSession('/onboarding');
  const trade = formData.get('trade');
  if (!isTrade(trade)) redirect('/onboarding?error=trade');

  const picked = formData.getAll('zips').map(String);
  const extra = String(formData.get('extraZips') ?? '')
    .split(/[\s,]+/)
    .filter(Boolean);
  const zips = [...new Set([...picked, ...extra])].filter((z) => /^\d{5}$/.test(z)).slice(0, 25);
  if (!zips.length) redirect(`${String(formData.get('back') ?? '/onboarding')}?error=zips`);

  const digest_enabled = formData.get('digest') === 'on';
  if (isDemo()) {
    await writeDemo({ trade, zips, digest: digest_enabled });
    revalidatePath('/dashboard');
    const next = String(formData.get('next') ?? '/dashboard');
    redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  }
  const { error } = await supabaseAdmin().from('profiles').update({ trade, zips, digest_enabled }).eq('id', user.id);
  if (error) throw error;

  revalidatePath('/dashboard');
  const next = String(formData.get('next') ?? '/dashboard');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
}
