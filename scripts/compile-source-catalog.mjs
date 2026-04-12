import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const shardsDir = path.join(repoRoot, 'data', 'sources');
const outputPath = path.join(repoRoot, 'data', 'sources.json');
const args = new Set(process.argv.slice(2));
const quiet = args.has('--quiet');

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
}

function compareByPath(left, right) {
  return left.localeCompare(right);
}

function applyRefreshPolicy(source) {
  if (!source || typeof source !== 'object') return source;
  const isCritical = source.lane === 'incidents' || source.isTrustedOfficial === true;
  if (!isCritical) return source;

  const explicit = Number(source.refreshEveryHours);
  const hourlyCadence = 1;
  const next = { ...source };

  if (!Number.isFinite(explicit)) {
    next.refreshEveryHours = hourlyCadence;
    return next;
  }

  next.refreshEveryHours = Math.min(explicit, hourlyCadence);
  return next;
}

async function readShard(filePath) {
  const raw = stripBom(await fs.readFile(filePath, 'utf8'));
  const parsed = JSON.parse(raw);
  const sources = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.sources)
      ? parsed.sources
      : null;
  if (!sources) {
    throw new Error(`Invalid source shard at ${path.relative(repoRoot, filePath)}: expected array or { sources: [] }`);
  }
  return sources.map(applyRefreshPolicy);
}

async function listShardFiles() {
  const hasShards = await exists(shardsDir);
  if (!hasShards) return [];
  const regionDirs = await fs.readdir(shardsDir, { withFileTypes: true });
  const files = [];
  for (const entry of regionDirs) {
    if (!entry.isDirectory()) continue;
    const regionPath = path.join(shardsDir, entry.name);
    const subEntries = await fs.readdir(regionPath, { withFileTypes: true });
    for (const sub of subEntries) {
      if (!sub.isFile() || !sub.name.endsWith('.json')) continue;
      files.push(path.join(regionPath, sub.name));
    }
  }
  return files.sort(compareByPath);
}

export async function compileSourcesCatalog() {
  const shardFiles = await listShardFiles();
  if (!shardFiles.length) {
    if (!quiet) {
      console.log('No source shards found; keeping existing data/sources.json unchanged.');
    }
    return { sources: null, shardFiles: [] };
  }

  const allSources = [];
  for (const shardPath of shardFiles) {
    const shardSources = await readShard(shardPath);
    allSources.push(...shardSources);
  }

  const payload = {
    sources: allSources
  };
  const rendered = JSON.stringify(payload, null, 2) + '\n';
  await fs.writeFile(outputPath, rendered, 'utf8');
  if (!quiet) {
    console.log(`Compiled ${shardFiles.length} source shard(s) into data/sources.json (${allSources.length} sources).`);
  }
  return { sources: allSources, shardFiles };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  compileSourcesCatalog().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
