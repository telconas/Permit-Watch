// Where scraped permits are kept. Two interchangeable stores:
//   JsonStore     → data/permits.json (no database; the website reads this file)
//   SupabaseStore → the `permits` table
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** complete = the stored record has the full detail page (all fields). */
export type Existing = { app_id: string; status: string | null; detail_scraped_at: string | null; complete: boolean };
export type RunStats = { listed: number; inserted: number; updated: number };
export type StoredRecord = Record<string, unknown> & { app_id: string; status?: string | null };

export interface Store {
  name: string;
  start(): Promise<void>;
  existing(ids: string[]): Promise<Map<string, Existing>>;
  /** hasDetail = false means only list-level fields were refreshed. Returns 'inserted' | 'updated'. */
  put(record: StoredRecord, hasDetail: boolean): Promise<'inserted' | 'updated'>;
  flush(): Promise<void>;
  finish(stats: RunStats, error?: string): Promise<void>;
}

// ------------------------------------------------------------------ JSON file

export type PermitsFile = {
  updatedAt: string | null;
  lastRun: (RunStats & { finished_at: string; error: string | null }) | null;
  permits: StoredRecord[];
};

export const DEFAULT_JSON_PATH = 'data/permits.json';

export function readPermitsFile(path = DEFAULT_JSON_PATH): PermitsFile {
  if (!existsSync(path)) return { updatedAt: null, lastRun: null, permits: [] };
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<PermitsFile>;
  return { updatedAt: parsed.updatedAt ?? null, lastRun: parsed.lastRun ?? null, permits: parsed.permits ?? [] };
}

/** One permit per line, so daily git diffs stay small and readable. */
export function writePermitsFile(file: PermitsFile, path = DEFAULT_JSON_PATH) {
  const sorted = [...file.permits].sort(
    (a, b) => String(b.applied_date ?? '').localeCompare(String(a.applied_date ?? '')) || String(b.app_id).localeCompare(String(a.app_id)),
  );
  const body =
    '{\n' +
    `"updatedAt": ${JSON.stringify(file.updatedAt)},\n` +
    `"lastRun": ${JSON.stringify(file.lastRun)},\n` +
    '"permits": [\n' +
    sorted.map((p) => JSON.stringify(p)).join(',\n') +
    '\n]\n}\n';
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, body);
  renameSync(tmp, path); // never leave a half-written file behind
}

export class JsonStore implements Store {
  name: string;
  private file: PermitsFile = { updatedAt: null, lastRun: null, permits: [] };
  private byId = new Map<string, StoredRecord>();
  constructor(private path = DEFAULT_JSON_PATH) {
    this.name = `JSON file ${path}`;
  }

  async start() {
    this.file = readPermitsFile(this.path);
    this.byId = new Map(this.file.permits.map((p) => [p.app_id, p]));
  }

  async existing(ids: string[]) {
    const map = new Map<string, Existing>();
    for (const id of ids) {
      const p = this.byId.get(id);
      if (p)
        map.set(id, {
          app_id: id,
          status: (p.status as string) ?? null,
          detail_scraped_at: (p.detail_scraped_at as string) ?? null,
          complete: !!p.detail_scraped_at && !!p.fields,
        });
    }
    return map;
  }

  async put(record: StoredRecord, hasDetail: boolean) {
    const now = new Date().toISOString();
    const prev = this.byId.get(record.app_id);
    if (!prev) {
      this.byId.set(record.app_id, { id: record.app_id, first_seen_at: now, ...record });
      return 'inserted' as const;
    }
    const next: StoredRecord = { ...prev, ...record };
    if (!hasDetail) {
      // List-only refresh: keep the tags worked out from the full description.
      next.tags = prev.tags;
      next.tag_reasons = prev.tag_reasons;
    }
    if (prev.status !== record.status) next.status_changed_at = now;
    this.byId.set(record.app_id, next);
    return 'updated' as const;
  }

  async flush() {
    this.file.permits = [...this.byId.values()];
    this.file.updatedAt = new Date().toISOString();
    writePermitsFile(this.file, this.path);
  }

  async finish(stats: RunStats, error?: string) {
    this.file.lastRun = { ...stats, finished_at: new Date().toISOString(), error: error ?? null };
    await this.flush();
  }
}

// ------------------------------------------------------------------ Supabase

export class SupabaseStore implements Store {
  name = 'Supabase';
  private db: SupabaseClient;
  private runId: number | null = null;
  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  async start() {
    const { data } = await this.db.from('scrape_runs').insert({}).select('id').single();
    this.runId = data?.id ?? null;
  }

  async existing(ids: string[]) {
    const map = new Map<string, Existing>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await this.db.from('permits').select('app_id,status,detail_scraped_at,fields').in('app_id', ids.slice(i, i + 200));
      if (error) throw error;
      for (const r of data ?? []) {
        map.set(r.app_id, { app_id: r.app_id, status: r.status, detail_scraped_at: r.detail_scraped_at, complete: !!r.detail_scraped_at && !!r.fields });
        this.known.set(r.app_id, r.status);
      }
    }
    return map;
  }

  private known = new Map<string, string | null>();

  async put(record: StoredRecord, hasDetail: boolean) {
    const prevStatus = this.known.get(record.app_id);
    const existed = this.known.has(record.app_id);
    const payload: StoredRecord = existed && prevStatus !== record.status ? { ...record, status_changed_at: new Date().toISOString() } : { ...record };
    if (existed && !hasDetail) {
      delete payload.tags;
      delete payload.tag_reasons;
      const { error } = await this.db.from('permits').update(payload).eq('app_id', record.app_id);
      if (error) throw error;
      return 'updated' as const;
    }
    const { error } = await this.db.from('permits').upsert(payload, { onConflict: 'app_id' });
    if (error) throw error;
    return existed ? ('updated' as const) : ('inserted' as const);
  }

  async flush() {
    /* writes are immediate */
  }

  async finish(stats: RunStats, error?: string) {
    if (this.runId) await this.db.from('scrape_runs').update({ ...stats, error: error ?? null, finished_at: new Date().toISOString() }).eq('id', this.runId);
  }
}
