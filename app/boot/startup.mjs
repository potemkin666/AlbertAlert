import {
  loadInitialResources,
  refreshLiveFeedNow,
  refreshLiveFeedUntilUpdated,
  startFeedPolling
} from '../feed/index.mjs';
import { syncSourceRequests } from '../feed/source-requests.mjs';
import { checkAndPlayAlert } from '../../shared/sound-alert.mjs';

export function bootstrapMap(mapController, { idleTimeoutMs, fallbackDelayMs }) {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => mapController.ensureMap(), { timeout: idleTimeoutMs });
  } else {
    setTimeout(() => mapController.ensureMap(), fallbackDelayMs);
  }
}

export function startRuntimeLifecycle({
  state,
  urls,
  pollIntervalMs,
  normaliseAlert,
  invalidateDerivedView,
  renderAll,
  renderSourceRequestsWithState,
  saveSourceRequests
}) {
  let previousAlerts = [];

  loadInitialResources(
    state,
    {
      liveFeedUrl: urls.liveFeedUrl,
      geoLookupUrl: urls.geoLookupUrl,
      watchGeographyUrl: urls.watchGeographyUrl
    },
    normaliseAlert,
    () => {
      previousAlerts = [...state.alerts];
      invalidateDerivedView();
      renderAll();
    }
  );

  startFeedPolling(state, pollIntervalMs, urls.liveFeedUrl, normaliseAlert, () => {
    checkAndPlayAlert({ previousAlerts, currentAlerts: state.alerts });
    previousAlerts = [...state.alerts];
    invalidateDerivedView();
    renderAll();
  });

  syncSourceRequests(state, urls.sourceRequestApiUrl, () => {
    saveSourceRequests();
    renderSourceRequestsWithState();
  });
}

export function refreshFeed({
  state,
  liveFeedUrl,
  normaliseAlert,
  invalidateDerivedView,
  renderAll
}) {
  return refreshLiveFeedNow(state, liveFeedUrl, normaliseAlert, () => {
    invalidateDerivedView();
    renderAll();
  });
}

export function refreshFeedUntilUpdated({
  state,
  liveFeedUrl,
  normaliseAlert,
  invalidateDerivedView,
  renderAll,
  previousGeneratedAt
}) {
  return refreshLiveFeedUntilUpdated(
    state,
    liveFeedUrl,
    normaliseAlert,
    () => {
      invalidateDerivedView();
      renderAll();
    },
    { previousGeneratedAt }
  );
}
