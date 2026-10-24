'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(error ? 'error' : 'idle');
  const [message, setMessage] = useState(error ? 'That sign-in link expired or was already used. Send a new one.' : '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` },
    });
    if (error) {
      setState('error');
      setMessage(error.message);
    } else {
      setState('sent');
    }
  }

  if (state === 'sent') {
    return (
      <div className="mt-6 rounded-lg bg-brand-soft p-4 text-brand-dark" role="status">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-sm">We sent a sign-in link to {email}. Open it on this device.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">
        Email
        <input
          className="field mt-1.5"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
        />
      </label>
      {state === 'error' && (
        <p className="text-sm text-[#a3260f]" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="btn-hot w-full" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}
