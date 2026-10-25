'use client';
// Saved permits live in this browser only (localStorage): nobody else can see them, and they
// aren't sent anywhere. Each entry keeps a copy of the permit's search record, so the Saved page
// still shows it if the permit later drops out of the site's data.
import { useSyncExternalStore } from 'react';
import type { Rec } from '@/lib/search-core';

export type Saved = Rec & { sv: string /* saved at, ISO */ };

const KEY = 'pw_saved';
const EMPTY: Saved[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; list: Saved[] } = { raw: null, list: EMPTY };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): Saved[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.list;
  let list: Saved[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter((s) => s && typeof s.id === 'string');
  } catch {
    /* corrupt value: treat as empty */
  }
  cache = { raw, list };
  return list;
}

function write(list: Saved[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private window or storage full: saving just doesn't stick */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb(); // another tab changed the list
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/** The saved list, newest first. Empty during server render and before hydration. */
export function useSaved(): Saved[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function isSaved(list: Saved[], id: string) {
  return list.some((s) => s.id === id);
}

export function toggleSaved(rec: Rec) {
  const list = snapshot();
  if (isSaved(list, rec.id)) write(list.filter((s) => s.id !== rec.id));
  else write([{ ...rec, sv: new Date().toISOString() }, ...list]);
}

export function removeSaved(id: string) {
  write(snapshot().filter((s) => s.id !== id));
}

/** Refresh stored copies with newer data (stage, finished date) without changing the order. */
export function refreshSaved(current: Map<string, Rec>) {
  const list = snapshot();
  let changed = false;
  const next = list.map((s) => {
    const r = current.get(s.id);
    if (!r || JSON.stringify({ ...r, sv: s.sv }) === JSON.stringify(s)) return s;
    changed = true;
    return { ...r, sv: s.sv };
  });
  if (changed) write(next);
}
