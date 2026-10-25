// Where scraped permits are kept: data/permits.json, which the website reads directly.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** complete = the stored record has the full detail page (all fields). */
export type Existing = { app_id: string; status: string | null; detail_scraped_at: string | null; complete: boolean; failures: number };
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
  lastRun: (RunStats & { started_at?: string; finished_at: string; error: string | null }) | null;
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

  private startedAt = new Date().toISOString();

  async start() {
    this.startedAt = new Date().toISOString();
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
          failures: Number(p.detail_failures ?? 0) || 0,
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
    this.file.lastRun = { ...stats, started_at: this.startedAt, finished_at: new Date().toISOString(), error: error ?? null };
    await this.flush();
  }
}
