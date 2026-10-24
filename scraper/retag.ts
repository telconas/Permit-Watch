/** Re-applies lib/tags.ts to every stored permit. Run after changing the tagging rules. */
import './env';
import { createClient } from '@supabase/supabase-js';
import { tagPermit } from '../lib/tags';
import { readPermitsFile, writePermitsFile } from './store';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || process.argv.includes('--json')) {
  // No database: retag data/permits.json in place.
  const file = readPermitsFile();
  for (const p of file.permits) {
    const { tags, reasons } = tagPermit(p as Parameters<typeof tagPermit>[0]);
    p.tags = tags;
    p.tag_reasons = reasons;
  }
  writePermitsFile(file);
  console.log(`retagged ${file.permits.length} permits in data/permits.json`);
} else {
  const db = createClient(url, key, { auth: { persistSession: false } });
  let from = 0;
  let changed = 0;
  for (;;) {
    const { data, error } = await db.from('permits').select('app_id,app_type,subtype,work_type,description').order('app_id').range(from, from + 499);
    if (error) throw error;
    if (!data?.length) break;
    for (const p of data) {
      const { tags, reasons } = tagPermit(p);
      const { error: e } = await db.from('permits').update({ tags, tag_reasons: reasons }).eq('app_id', p.app_id);
      if (e) throw e;
      changed++;
    }
    from += data.length;
  }
  console.log(`retagged ${changed} permits`);
}
