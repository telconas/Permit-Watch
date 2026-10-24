import { SetupForm } from '@/components/SetupForm';
import { isSubscribed, requireSession } from '@/lib/session';
import { longDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, profile } = await requireSession('/settings');
  const { error } = await searchParams;
  const subscribed = isSubscribed(profile);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-extrabold">Settings</h1>

      <section className="card p-5 sm:p-8">
        <SetupForm
          trade={profile.trade}
          zips={profile.zips ?? []}
          digest={profile.digest_enabled}
          next="/dashboard"
          back="/settings"
          submitLabel="Save changes"
          error={error}
        />
      </section>

      <section className="card p-5 sm:p-8">
        <h2 className="text-xl font-bold">Billing</h2>
        {subscribed ? (
          <>
            <p className="mt-2 text-ink-2">
              Permit Watch Sarasota · $99/month ·{' '}
              {profile.subscription_status === 'past_due' ? (
                <span className="font-semibold text-[#a3260f]">payment past due</span>
              ) : (
                <>renews {longDate(profile.current_period_end)}</>
              )}
            </p>
            <form action="/api/stripe/portal" method="post" className="mt-4">
              <button className="btn-ghost" type="submit">
                Manage billing or cancel
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-2 text-ink-2">No active subscription. Subscribe to unlock every match and the morning digest.</p>
            <form action="/api/stripe/checkout" method="post" className="mt-4">
              <button className="btn-hot" type="submit">
                Subscribe for $99/month
              </button>
            </form>
          </>
        )}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-8">
        <div>
          <h2 className="text-xl font-bold">Account</h2>
          <p className="mt-1 text-ink-2">Signed in as {user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
