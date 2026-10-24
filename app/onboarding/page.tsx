import { SetupForm } from '@/components/SetupForm';
import { requireSession } from '@/lib/session';

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { profile } = await requireSession('/onboarding');
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Step 1 of 2</p>
      <h1 className="mt-2 text-4xl font-extrabold">Set up your trade</h1>
      <p className="mt-2 text-ink-2">Tell us what you do and where. Then you&apos;ll see this morning&apos;s matches.</p>
      <div className="mt-8 card p-5 sm:p-8">
        <SetupForm
          trade={profile.trade}
          zips={profile.zips ?? []}
          digest={profile.digest_enabled ?? true}
          next="/dashboard?welcome=1"
          back="/onboarding"
          submitLabel="Show my matches →"
          error={error}
        />
      </div>
    </main>
  );
}
