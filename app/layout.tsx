import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Permit Watch Sarasota: search every building permit',
  description:
    'Search every City of Sarasota building permit by job, company, owner or address: pools, kitchens, roofs, trees and more. Updated every morning.',
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
        {/* Site analytics */}
        <script src="https://simple-analytics-das-kndy.bolt.host/tracker.js" data-site="https://permit-watch.netlify.app/" defer />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-xs text-muted sm:px-6">
            <p>Source: City of Sarasota Building &amp; Engineering permit portal, imported every morning.</p>
            <p>
              Permit Watch is independent and not affiliated with the City of Sarasota. Records can be incomplete, delayed or changed by the
              city; check the city record before acting on them. Categories and lead tags are worked out automatically and can be wrong.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
