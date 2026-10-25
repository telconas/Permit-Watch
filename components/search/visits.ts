// Remembers when this browser last used the site, for "New since your last visit".
// Browser storage only: per viewer, can be empty or blocked, so every access is guarded.

const LAST_SEEN = 'pw_last_seen';
const PREV_VISIT = 'pw_prev_visit';
const SESSION_GAP_MS = 30 * 60 * 1000; // a gap of 30+ minutes starts a new visit

function get(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private window or storage blocked: the feature just stays off */
  }
}

/** Returns the start of the previous visit (ISO), or null on a first visit. Call once per page load. */
export function registerVisit(now = Date.now()): string | null {
  const last = Number(get(LAST_SEEN)) || 0;
  let prev = get(PREV_VISIT);
  if (last && now - last > SESSION_GAP_MS) {
    prev = new Date(last).toISOString();
    set(PREV_VISIT, prev);
  }
  set(LAST_SEEN, String(now));
  return last ? prev : null;
}
