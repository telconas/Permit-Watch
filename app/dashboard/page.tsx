import { redirect } from 'next/navigation';

// The old dashboard address now goes to the search page.
export default function Dashboard() {
  redirect('/');
}
