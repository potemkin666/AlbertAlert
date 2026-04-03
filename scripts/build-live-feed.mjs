import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  FEED_SOURCE_CONCURRENCY,
  HARD_SKIP_SOURCE_IDS,
  MAX_SOURCE_ERRORS_TO_REPORT,
  outputPath,
  sourcePath
} from './build-live-feed/config.mjs';
import {
  buildAlert,
  dedupeAndSortAlerts,
  shouldKeepItem
} from './build-live-feed/alerts.mjs';
import {
  geoLookupSnapshot,
  safeLoadGeoLookup
} from './build-live-feed/geo.mjs';
import { buildHealthBlock } from './build-live-feed/health.mjs';
import {
  mapWithConcurrency,
  readExisting,
  readJsonFile,
  normaliseSourcesPayload,
  sleep,
  summariseSourceError,
  fetchText
} from './build-live-feed/io.mjs';
import {
  enrichHtmlItems,
  parseFeedItems,
  parseHtmlItems
} from './build-live-feed/parsing.mjs';
import {
  inferReliabilityProfile,
  inferSourceTier,
  sourceLooksEnglish
} from '../shared/taxonomy.mjs';

export { buildHealthBlock } from './build-live-feed/health.mjs';

async function main() {
  const existing = await readExisting();
  const geoLookupFallbackNote = await safeLoadGeoLookup(existing);

  let sources;
  try {
    sources = normaliseSourcesPayload(await readJsonFile(sourcePath));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Source catalog load failed: ${message}`);
    if (existing) {
      const generatedAt = new Date().toISOString();
      const buildWarning = `Source catalog load failed; preserved previous alerts. ${message}`;
      const fallbackPayload = {
        ...existing,
        generatedAt,
        buildWarning,
        sourceErrors: [
          {
            id: 'sources-json',
            provider: 'Brialert builder',
            endpoint: sourcePath,
            message
          }
        ],
        health: buildHealthBlock({
          generatedAt,
          checked: Number(existing?.sourceCount || 0),
          sourceErrors: [{ message }],
          buildWarning,
          previousHealth: existing?.health,
          successfulRefresh: false,
          usedFallback: true
        })
      };
      await fs.writeFile(outputPath, JSON.stringify(fallbackPayload, null, 2) + '\n', 'utf8');
      console.log('Preserved previous live-alerts.json because sources.json could not be loaded.');
      return;
    }
    throw error;
  }

  const items = [];
  const sourceErrors = [];
  const eligibleSources = sources.filter((source) => {
    if (!sourceLooksEnglish(source)) return false;
    if (HARD_SKIP_SOURCE_IDS.has(source.id)) {
      console.warn(`Skipping disabled source: ${source.id}`);
      return false;
    }
    return true;
  });

  const sourceResults = await mapWithConcurrency(
    eligibleSources,
    FEED_SOURCE_CONCURRENCY,
    async (source, sourceIndex) => {
      const localErrors = [];
      const builtAlerts = [];

      try {
        await sleep(sourceIndex * 60);
        const body = await fetchText(source.endpoint);
        const parsed = source.kind === 'rss' || source.kind === 'atom'
          ? parseFeedItems(source, body)
          : parseHtmlItems(source, body);
        const preLimited = parsed.slice(0, source.kind === 'html' ? 8 : 6);
        const hydrated = source.kind === 'html' ? await enrichHtmlItems(source, preLimited) : preLimited;
        const reliabilityProfile = inferReliabilityProfile(source, inferSourceTier(source));
        const itemLimit = reliabilityProfile === 'tabloid' ? 1 : source.lane === 'incidents' ? 4 : 2;
        const kept = hydrated.filter((item) => {
          try {
            return shouldKeepItem(source, item);
          } catch (error) {
            localErrors.push(summariseSourceError(source, error));
            console.error(`Source item filter failed: ${source.id} - ${error instanceof Error ? error.message : String(error)}`);
            return false;
          }
        }).slice(0, itemLimit);

        kept.forEach((item, idx) => {
          try {
            builtAlerts.push(buildAlert(source, item, idx));
          } catch (error) {
            localErrors.push(summariseSourceError(source, error));
            console.error(`Alert build failed: ${source.id} - ${error instanceof Error ? error.message : String(error)}`);
          }
        });

        return { checked: 1, alerts: builtAlerts, sourceErrors: localErrors };
      } catch (error) {
        const summary = summariseSourceError(source, error);
        localErrors.push(summary);
        console.error(`Source failed: ${summary.id} [${source.kind}/${source.lane}] - ${summary.message}`);
        return { checked: 0, alerts: [], sourceErrors: localErrors };
      }
    }
  );

  let checked = 0;
  for (const result of sourceResults) {
    checked += result.checked || 0;
    if (Array.isArray(result.alerts) && result.alerts.length) items.push(...result.alerts);
    if (Array.isArray(result.sourceErrors) && result.sourceErrors.length) sourceErrors.push(...result.sourceErrors);
  }

  const deduped = dedupeAndSortAlerts(items);
  const preservedAlerts = !deduped.length && sourceErrors.length && Array.isArray(existing?.alerts) && existing.alerts.length;
  const finalAlerts = preservedAlerts ? existing.alerts : deduped.slice(0, 80);
  const buildWarning = [
    geoLookupFallbackNote,
    preservedAlerts ? 'Build produced no fresh alerts; preserved previous alert set.' : null
  ].filter(Boolean).join(' | ') || null;
  const generatedAt = new Date().toISOString();

  const payload = {
    generatedAt,
    sourceCount: checked,
    alertCount: finalAlerts.length,
    alerts: finalAlerts,
    sourceErrors: sourceErrors.slice(0, MAX_SOURCE_ERRORS_TO_REPORT),
    geoLookupSnapshot: geoLookupSnapshot(),
    buildWarning,
    health: buildHealthBlock({
      generatedAt,
      checked,
      sourceErrors,
      buildWarning,
      previousHealth: existing?.health,
      successfulRefresh: !preservedAlerts,
      usedFallback: preservedAlerts || Boolean(geoLookupFallbackNote)
    })
  };

  const currentComparable = JSON.stringify(existing?.alerts || []);
  const nextComparable = JSON.stringify(payload.alerts);

  if (currentComparable === nextComparable && !sourceErrors.length && !geoLookupFallbackNote) {
    console.log('No alert changes detected.');
    return;
  }

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${payload.alertCount} alerts from ${payload.sourceCount} sources.`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
