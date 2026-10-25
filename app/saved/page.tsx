import type { Metadata } from 'next';
import { SavedApp } from '@/components/saved/SavedApp';

export const metadata: Metadata = {
  title: 'Saved permits · Permit Watch Sarasota',
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return <SavedApp />;
}
