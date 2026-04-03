import {
  EXPECTED_REFRESH_MINUTES,
  STALE_AFTER_MINUTES
} from './config.mjs';
import { clean } from '../../shared/taxonomy.mjs';

export function buildHealthBlock({
  generatedAt,
  checked,
  sourceErrors,
  buildWarning,
  previousHealth = null,
  successfulRefresh = true,
  usedFallback = false
}) {
  const runId = clean(process.env.GITHUB_RUN_ID);
  const runNumber = clean(process.env.GITHUB_RUN_NUMBER);
  const runAttempt = clean(process.env.GITHUB_RUN_ATTEMPT);
  const headSha = clean(process.env.GITHUB_SHA);
  const eventName = clean(process.env.GITHUB_EVENT_NAME);
  const prior = previousHealth && typeof previousHealth === 'object' ? previousHealth : {};
  const successfulSourceCount = successfulRefresh
    ? checked
    : Number(prior.lastSuccessfulSourceCount || 0);

  return {
    expectedRefreshMinutes: EXPECTED_REFRESH_MINUTES,
    staleAfterMinutes: STALE_AFTER_MINUTES,
    lastAttemptedRefreshTime: generatedAt,
    usedFallback,
    lastSuccessfulRefreshTime: successfulRefresh
      ? generatedAt
      : clean(prior.lastSuccessfulRefreshTime) || null,
    lastSuccessfulRunId: successfulRefresh
      ? (runId || null)
      : clean(prior.lastSuccessfulRunId) || null,
    lastSuccessfulRunNumber: successfulRefresh
      ? (runNumber || null)
      : clean(prior.lastSuccessfulRunNumber) || null,
    lastSuccessfulRunAttempt: successfulRefresh
      ? (runAttempt || null)
      : clean(prior.lastSuccessfulRunAttempt) || null,
    lastSuccessfulHeadSha: successfulRefresh
      ? (headSha || null)
      : clean(prior.lastSuccessfulHeadSha) || null,
    lastSuccessfulEvent: successfulRefresh
      ? (eventName || null)
      : clean(prior.lastSuccessfulEvent) || null,
    lastSuccessfulSourceCount: successfulSourceCount,
    sourceErrorCount: sourceErrors.length,
    hasWarnings: Boolean(buildWarning) || sourceErrors.length > 0
  };
}
