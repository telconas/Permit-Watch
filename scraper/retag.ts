/** Re-applies lib/tags.ts to every permit in data/permits.json. Run after changing the tagging rules. */
import { tagPermit } from '../lib/tags';
import { readPermitsFile, writePermitsFile } from './store';

const file = readPermitsFile();
for (const p of file.permits) {
  const { tags, reasons } = tagPermit(p as Parameters<typeof tagPermit>[0]);
  p.tags = tags;
  p.tag_reasons = reasons;
}
writePermitsFile(file);
console.log(`retagged ${file.permits.length} permits in data/permits.json`);
