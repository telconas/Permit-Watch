// "Back to search" from a permit page: return to the exact search (filters and scroll) the
// visitor came from. Per tab, browser storage only, so every access is guarded.

const KEY = 'pw_search_nav';

type Nav = { url: string; permit: string };

/** Called when a search result is clicked. */
export function rememberSearch(permitId: string) {
  try {
    const nav: Nav = { url: window.location.pathname + window.location.search, permit: permitId };
    window.sessionStorage.setItem(KEY, JSON.stringify(nav));
  } catch {
    /* storage blocked: the back link just goes to the search page */
  }
}

export function recalledSearch(): Nav | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Nav) : null;
  } catch {
    return null;
  }
}
