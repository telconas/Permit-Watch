import Link from 'next/link';
import { Logo } from './Logo';
import { getSession } from '@/lib/session';
import { openAccess } from '@/lib/demo';

export async function SiteHeader() {
  const session = await getSession().catch(() => null);
  return (
    <header className="border-b border-line bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={session ? '/dashboard' : '/'} aria-label="Permit Watch home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {openAccess() ? (
            <Link href="/dashboard" className="btn-hot">
              Browse permits
            </Link>
          ) : session ? (
            <>
              <Link href="/dashboard" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-ground sm:inline-block">
                Permits
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-2 font-medium hover:bg-ground">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-ground">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn-hot">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
