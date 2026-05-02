import { escapeHtml } from '../app/utils/text.mjs';
import { MAP_VIEW_MODES, NEARBY_RADIUS_KM, resolveMapMode } from './ui-constants.mjs';

const GROUP_PREVIEW_LIMIT = 3;
const SEVERITY_LEVELS = Object.freeze(['critical', 'high', 'elevated', 'moderate']);
const SEVERITY_RANK = Object.freeze({
  critical: 4,
  high: 3,
  elevated: 2,
  moderate: 1
});

const COUNTRY_ALIAS_MAP = new Map([
  ['uk', 'United Kingdom'],
  ['u.k.', 'United Kingdom'],
  ['united kingdom', 'United Kingdom'],
  ['great britain', 'United Kingdom'],
  ['britain', 'United Kingdom'],
  ['england', 'United Kingdom'],
  ['scotland', 'United Kingdom'],
  ['wales', 'United Kingdom'],
  ['northern ireland', 'United Kingdom'],
  ['united states', 'United States'],
  ['u.s.', 'United States'],
  ['u.s.a.', 'United States'],
  ['usa', 'United States'],
  ['us', 'United States']
]);

function severityClass(alert) {
  const severity = String(alert?.severity || '').toLowerCase();
  return SEVERITY_LEVELS.includes(severity) ? severity : 'moderate';
}

function severityLabel(level) {
  if (level === 'critical') return 'Critical';
  if (level === 'high') return 'High';
  if (level === 'elevated') return 'Elevated';
  return 'Moderate';
}

function topSeverity(alerts) {
  return alerts.reduce((highest, alert) => {
    const current = severityClass(alert);
    return SEVERITY_RANK[current] > SEVERITY_RANK[highest] ? current : highest;
  }, 'moderate');
}

function countLabel(count) {
  return `${count} alert${count === 1 ? '' : 's'}`;
}

function statusLine(mode, count, hasUserLocation = true) {
  if (count <= 0) {
    if (mode === MAP_VIEW_MODES.nearby && !hasUserLocation) return 'Location unavailable';
    return 'No alerts in current view';
  }

  const label = countLabel(count);
  if (mode === MAP_VIEW_MODES.london) return `${label} in London`;
  if (mode === MAP_VIEW_MODES.nearby) {
    return hasUserLocation ? `${label} within ${NEARBY_RADIUS_KM} km` : `${label} shown until location is available`;
  }
  return `${label} worldwide`;
}

function normaliseCountryName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return COUNTRY_ALIAS_MAP.get(raw.toLowerCase()) || raw;
}

function splitLocation(alert) {
  const raw = String(alert?.location || '').trim();
  if (!raw) return { raw: '', parts: [] };
  return {
    raw,
    parts: raw.split(',').map((part) => part.trim()).filter(Boolean)
  };
}

function countryLabelFromAlert(alert) {
  const { parts, raw } = splitLocation(alert);
  if (parts.length >= 2) return normaliseCountryName(parts[parts.length - 1]);
  if (raw) return normaliseCountryName(raw);

  const region = String(alert?.region || '').toLowerCase();
  if (region === 'uk' || region === 'london') return 'United Kingdom';
  if (region === 'us') return 'United States';
  return '';
}

function areaLabelFromAlert(alert) {
  const { parts, raw } = splitLocation(alert);
  if (parts.length >= 1) return parts[0];
  if (raw) return raw;
  return '';
}

function locationBucketLabel(alert, mode) {
  if (mode === MAP_VIEW_MODES.world) return countryLabelFromAlert(alert) || 'Unknown location';
  return areaLabelFromAlert(alert) || countryLabelFromAlert(alert) || 'Unknown location';
}

function groupKicker(mode) {
  return mode === MAP_VIEW_MODES.world ? 'Country' : 'Area';
}

function buildLocationGroups(alerts, mode) {
  const buckets = new Map();

  alerts.forEach((alert) => {
    const label = locationBucketLabel(alert, mode);
    const key = label.toLowerCase();
    const existing = buckets.get(key) || {
      key,
      label,
      kicker: groupKicker(mode),
      alerts: []
    };
    existing.alerts.push(alert);
    buckets.set(key, existing);
  });

  return Array.from(buckets.values())
    .map((group) => {
      const sortedAlerts = [...group.alerts].sort((left, right) => {
        const severityDelta = SEVERITY_RANK[severityClass(right)] - SEVERITY_RANK[severityClass(left)];
        if (severityDelta !== 0) return severityDelta;
        return String(left.title || '').localeCompare(String(right.title || ''));
      });

      return {
        ...group,
        alerts: sortedAlerts,
        severity: topSeverity(sortedAlerts)
      };
    })
    .sort((left, right) => {
      if (right.alerts.length !== left.alerts.length) return right.alerts.length - left.alerts.length;
      const severityDelta = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
      if (severityDelta !== 0) return severityDelta;
      return left.label.localeCompare(right.label);
    });
}

function buildSummaryItems(alerts, groups, state, mode) {
  return [
    { label: 'Alerts', value: String(alerts.length) },
    {
      label: mode === MAP_VIEW_MODES.world ? 'Countries' : 'Areas',
      value: String(groups.length)
    },
    { label: 'Highest', value: alerts.length ? severityLabel(topSeverity(alerts)) : 'None' },
    {
      label: 'Scope',
      value: mode === MAP_VIEW_MODES.nearby
        ? state?.userLocation
          ? `${NEARBY_RADIUS_KM} km radius`
          : 'Location unavailable'
        : mode === MAP_VIEW_MODES.london
          ? 'London focus'
          : 'Global scan'
    }
  ];
}

function renderSummaryItems(items) {
  return items.map((item) => `
    <div class="location-chip">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>`).join('');
}

function renderAlertButton(alert) {
  const meta = [alert.location || 'Unknown location', alert.source || 'Unknown source', alert.time || 'Time unavailable']
    .map((value) => escapeHtml(String(value)))
    .join(' • ');

  return `
    <button class="location-alert-button" type="button" data-open-detail="${escapeHtml(String(alert.id || ''))}">
      <strong>${escapeHtml(String(alert.title || 'Untitled alert'))}</strong>
      <span class="location-alert-meta">${meta}</span>
    </button>`;
}

function renderGroup(group) {
  const preview = group.alerts.slice(0, GROUP_PREVIEW_LIMIT).map(renderAlertButton).join('');
  const remaining = group.alerts.length - GROUP_PREVIEW_LIMIT;

  return `
    <article class="location-group" data-severity="${escapeHtml(group.severity)}">
      <div class="location-group-header">
        <div>
          <p class="location-group-kicker">${escapeHtml(group.kicker)}</p>
          <h4>${escapeHtml(group.label)}</h4>
          <p class="location-group-meta">${escapeHtml(countLabel(group.alerts.length))} • Highest ${escapeHtml(severityLabel(group.severity))}</p>
        </div>
        <span class="location-group-count">${group.alerts.length}</span>
      </div>
      <div class="location-group-list">${preview}</div>
      ${remaining > 0 ? `<p class="location-group-more">+${remaining} more alerts in this area</p>` : ''}
    </article>`;
}

function renderLocationsMarkup({ alerts, groups, state, mode }) {
  const intro = mode === MAP_VIEW_MODES.world
    ? 'Track the busiest countries and drill into the most urgent alerts.'
    : mode === MAP_VIEW_MODES.nearby
      ? 'Surface the closest places first, while keeping direct access to the live alert detail.'
      : 'Scan London areas without loading a slippy map.';

  return `
    <section class="locations-panel" aria-label="Locations overview">
      <p class="panel-copy locations-intro">${escapeHtml(intro)}</p>
      <div class="locations-summary">${renderSummaryItems(buildSummaryItems(alerts, groups, state, mode))}</div>
      <div class="locations-groups" role="list">${groups.map(renderGroup).join('')}</div>
    </section>`;
}

export function createMapController({ mapElement, mapStatusLine, mapEmptyState, openDetail }) {
  let lastState = null;
  let lastView = null;
  let currentAlerts = [];
  let eventsBound = false;

  function bindEvents() {
    if (eventsBound || !mapElement) return;
    mapElement.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-detail]');
      if (!button) return;
      const nextAlert = currentAlerts.find((alert) => String(alert?.id || '') === String(button.dataset.openDetail || ''));
      if (nextAlert) openDetail(nextAlert);
    });
    eventsBound = true;
  }

  function ensureMap() {
    bindEvents();
    if (lastState && lastView) renderMap(lastState, lastView);
  }

  function invalidateSize() {}

  function renderMap(state, view) {
    lastState = state;
    lastView = view;
    bindEvents();
    if (!mapElement) return;

    const alerts = Array.isArray(view?.filtered) ? view.filtered : [];
    const mode = resolveMapMode(state?.mapViewMode);
    const groups = buildLocationGroups(alerts, mode);
    const hasUserLocation = Boolean(state?.userLocation && Number.isFinite(state.userLocation.lat) && Number.isFinite(state.userLocation.lng));

    currentAlerts = alerts;
    if (mapStatusLine) mapStatusLine.textContent = statusLine(mode, alerts.length, hasUserLocation);
    if (mapEmptyState) mapEmptyState.classList.toggle('hidden', alerts.length > 0);
    mapElement.innerHTML = alerts.length > 0 ? renderLocationsMarkup({ alerts, groups, state, mode }) : '';
  }

  return {
    mapStatusLine,
    ensureMap,
    invalidateSize,
    renderMap
  };
}

export {
  buildLocationGroups as _buildLocationGroups,
  buildSummaryItems as _buildSummaryItems,
  countryLabelFromAlert as _countryLabelFromAlert,
  locationBucketLabel as _locationBucketLabel,
  normaliseCountryName as _normaliseCountryName,
  renderLocationsMarkup as _renderLocationsMarkup,
  statusLine as _statusLine,
  topSeverity as _topSeverity
};
