import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_TIMEOUT_MS,
  RETRYABLE_STATUS_CODES,
  outputPath,
  repoRoot
} from './config.mjs';
import { clean } from '../../shared/taxonomy.mjs';

export function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
}

export async function readJsonFile(jsonPath) {
  const raw = stripBom(await fs.readFile(jsonPath, 'utf8'));
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON at ${path.relative(repoRoot, jsonPath)}: ${message}`);
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mapWithConcurrency(items, limit, mapper) {
  if (!Array.isArray(items) || !items.length) return [];
  const concurrency = Math.max(1, Math.min(limit || 1, items.length));
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export function arrayify(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function absoluteUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return base;
  }
}

export function parseSourceDate(rawDate) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normaliseLanguageTag(value) {
  return clean(value).toLowerCase().replace('_', '-');
}

export function isEnglishLanguage(value) {
  const lang = normaliseLanguageTag(value);
  return !lang || lang === 'en' || lang.startsWith('en-');
}

export async function fetchText(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; BrialertFeedBot/1.0; +https://potemkin666.github.io/Brialert/)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        'accept-language': 'en-GB,en;q=0.9',
        'cache-control': 'no-cache'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    if (!response.ok) {
      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < 3) {
        const retryAfterHeader = Number(response.headers.get('retry-after'));
        const retryDelay = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? retryAfterHeader * 1000
          : 1000 * Math.pow(2, attempt - 1);

        await sleep(retryDelay);
        return fetchText(url, attempt + 1);
      }

      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryable =
      message.includes('fetch failed') ||
      message.includes('aborted') ||
      message.includes('AbortError') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT');

    if (retryable && attempt < 3) {
      await sleep(1000 * Math.pow(2, attempt - 1));
      return fetchText(url, attempt + 1);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readExisting() {
  try {
    return await readJsonFile(outputPath);
  } catch {
    return null;
  }
}

export function summariseSourceError(source, error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    id: clean(source?.id) || 'unknown-source',
    provider: clean(source?.provider) || 'Unknown provider',
    endpoint: clean(source?.endpoint) || '',
    message
  };
}

export function normaliseSourcesPayload(rawSources) {
  const sources = Array.isArray(rawSources)
    ? rawSources
    : Array.isArray(rawSources?.sources)
      ? rawSources.sources
      : null;
  if (!sources) {
    throw new Error('Expected sources.json to contain an array or { sources: [] }.');
  }
  const seen = new Set();
  const duplicates = [];
  const unique = [];
  for (const source of sources) {
    const id = clean(source?.id);
    if (!id) {
      unique.push(source);
      continue;
    }
    if (seen.has(id)) {
      duplicates.push(id);
      continue;
    }
    seen.add(id);
    unique.push(source);
  }
  if (duplicates.length) {
    const uniqueDuplicates = [...new Set(duplicates)];
    console.warn(`Skipped ${duplicates.length} duplicate source entries across ${uniqueDuplicates.length} source id(s): ${uniqueDuplicates.join(', ')}`);
  }
  return unique;
}
