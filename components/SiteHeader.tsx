import Link from 'next/link';
import { Logo } from './Logo';
import { SavedLink } from './saved/SaveButton';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Permit Watch, search home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-muted md:block">Every City of Sarasota building permit, searchable</p>
          <SavedLink />
        </div>
      </div>
    </header>
  );
}
