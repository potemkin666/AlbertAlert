import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileSourcesCatalog } from '../compile-source-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const compiledPath = path.join(repoRoot, 'data', 'sources.json');

function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
}

async function main() {
  const before = stripBom(await fs.readFile(compiledPath, 'utf8'));
  const compiled = await compileSourcesCatalog();
  const after = JSON.stringify({ sources: compiled?.sources || [] }, null, 2) + '\n';
  if (before !== after) {
    throw new Error('data/sources.json is stale; run `npm run compile:sources` and commit the regenerated file.');
  }
  console.log('sources catalog freshness OK');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
