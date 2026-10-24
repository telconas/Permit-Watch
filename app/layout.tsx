import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { isDemo, usingSamplePermits } from '@/lib/demo';

export const metadata: Metadata = {
  title: 'Permit Watch Sarasota — permits sorted for your trade',
  description:
    "Every new City of Sarasota permit application, tagged for landscaping, fence, pool, gutter and blinds follow-on work, filtered to your ZIP codes and emailed each morning.",
};

export const viewport: Viewport = { themeColor: '#0f5c55', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen">
        {isDemo() && (
          <div className="bg-[#fff4cc] px-4 py-2 text-center text-sm text-[#5c4a00]">
            {usingSamplePermits() ? (
              <>
                Demo mode with sample permits. Run <code className="font-mono">npm run scrape:json</code> to load real ones.
              </>
            ) : (
              'Preview mode: real City of Sarasota permits. Sign-in and checkout are demo-only; no accounts or payments are real.'
            )}
          </div>
        )}
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
