import { LoginForm } from './LoginForm';
import { isDemo } from '@/lib/demo';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const signup = sp.mode === 'signup';
  const next = sp.next ?? (signup ? '/onboarding' : '/dashboard');
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-3xl font-bold">{signup ? 'Create your account' : 'Sign in'}</h1>
        {isDemo() ? (
          <>
            <p className="mt-2 text-ink-2">
              Preview mode: accounts aren&apos;t connected yet, so there&apos;s no email link. Continue as a demo user to try the setup,
              dashboard and checkout. Nothing is charged.
            </p>
            <form action="/auth/demo" method="post" className="mt-6">
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="btn-hot w-full">
                Continue as demo user
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-2 text-ink-2">
              {signup
                ? "Enter your email and we'll send a sign-in link. Next you'll pick your trade and ZIP codes."
                : "Enter your email and we'll send you a sign-in link. No password needed."}
            </p>
            <LoginForm next={next} error={sp.error} />
          </>
        )}
      </div>
    </main>
  );
}
