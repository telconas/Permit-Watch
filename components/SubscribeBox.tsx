export function SubscribeBox({ matches, tradeLabel }: { matches: number; tradeLabel: string }) {
  return (
    <div className="card border-hot/40 bg-hot-soft p-6 text-center sm:p-8">
      <h2 className="text-2xl font-bold">
        {matches > 3 ? `${(matches - 3).toLocaleString()} more ${tradeLabel.toLowerCase()} matches are waiting` : 'Get every match, every morning'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-ink-2">
        Subscribe to see the full list, owner and contractor details, and get the 7 AM digest. $99 a month, cancel anytime.
      </p>
      <form action="/api/stripe/checkout" method="post" className="mt-5">
        <button type="submit" className="btn-hot w-full max-w-xs text-base">
          Subscribe for $99/month
        </button>
      </form>
      <p className="mt-3 text-xs text-muted">Secure checkout by Stripe.</p>
    </div>
  );
}
