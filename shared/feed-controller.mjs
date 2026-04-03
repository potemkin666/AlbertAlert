import { isLondonAlert } from './alert-view-model.mjs';

export function filteredAlerts(state) {
  return state.alerts.filter((alert) =>
    (state.activeRegion === 'all' || (state.activeRegion === 'london' ? isLondonAlert(alert) : alert.region === state.activeRegion)) &&
    (state.activeLane === 'all' || alert.lane === state.activeLane)
  );
}

export function deriveView(state, deps) {
  const filtered = filteredAlerts(state);
  const responder = deps.sortAlertsByFreshness(filtered.filter(deps.isLiveIncidentCandidate));
  const context = deps.sortAlertsByFreshness(filtered.filter((alert) => {
    if (deps.isQuarantineCandidate(alert)) return false;
    if (alert.lane === 'incidents' && !deps.isTerrorRelevant(alert)) return false;
    return !deps.isLiveIncidentCandidate(alert);
  }));
  const quarantine = deps.sortAlertsByFreshness(filtered.filter(deps.isQuarantineCandidate)).slice(0, 6);
  const topPriority = responder[0] || context[0] || null;

  return { filtered, responder, context, quarantine, topPriority };
}

export function deriveFeedHealthStatus({
  health,
  generatedAt,
  sourceCount,
  fetchError,
  now = Date.now(),
  defaultStaleAfterMinutes = 22
}) {
  const feedHealth = health && typeof health === 'object' ? health : {};
  const staleAfterMinutes = Number(feedHealth.staleAfterMinutes || defaultStaleAfterMinutes);
  const lastRefresh = feedHealth.lastSuccessfulRefreshTime
    ? new Date(feedHealth.lastSuccessfulRefreshTime)
    : generatedAt || null;
  const lastRefreshMs = lastRefresh instanceof Date ? lastRefresh.getTime() : NaN;
  const isStale = Number.isFinite(lastRefreshMs)
    ? (now - lastRefreshMs) > staleAfterMinutes * 60_000
    : false;

  return {
    visible: Boolean(lastRefresh || fetchError),
    isStale,
    isFetchError: Boolean(fetchError),
    hasWarnings: Boolean(feedHealth.hasWarnings),
    usedFallback: Boolean(feedHealth.usedFallback),
    lastRefresh,
    runId: feedHealth.lastSuccessfulRunId || 'unknown',
    sourceCount: Number(feedHealth.lastSuccessfulSourceCount || sourceCount || 0)
  };
}

export async function loadGeoLookup(state, url) {
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.geoLookup = Array.isArray(data) ? data : [];
  } catch {
    state.geoLookup = [];
  }
}

export async function loadWatchGeography(state, url) {
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.watchGeographySites = Array.isArray(data) ? data : [];
  } catch {
    state.watchGeographySites = [];
  }
}

export async function loadLiveFeed(state, options) {
  const { liveFeedUrl, normaliseAlert, onAfterLoad } = options;
  const previousAlerts = state.alerts;
  const previousGeneratedAt = state.liveFeedGeneratedAt;
  const previousSourceCount = state.liveSourceCount;
  const previousHealth = state.liveFeedHealth;
  try {
    const response = await fetch(`${liveFeedUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.alerts = Array.isArray(data.alerts)
      ? data.alerts.map((alert, index) => normaliseAlert(alert, index, state.geoLookup))
      : [];
    state.liveFeedGeneratedAt = data.generatedAt ? new Date(data.generatedAt) : new Date();
    state.liveSourceCount = Number(data.sourceCount || 0);
    state.liveFeedHealth = data && typeof data.health === 'object' && data.health
      ? data.health
      : null;
    state.liveFeedFetchError = null;
  } catch (error) {
    state.alerts = previousAlerts;
    state.liveFeedGeneratedAt = previousGeneratedAt;
    state.liveSourceCount = previousSourceCount;
    state.liveFeedHealth = previousHealth;
    state.liveFeedFetchError = {
      message: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString()
    };
  }
  state.lastBrowserPollAt = new Date();
  if (typeof onAfterLoad === 'function') onAfterLoad();
}
