export function createMapController(config) {
  const {
    mapElement,
    mapSummary,
    mapLayerSummary,
    watchLayerLabels,
    openDetail
  } = config;

  let liveMap = null;
  let liveMarkers = [];
  let watchSiteMarkers = [];
  let lastMapSignature = '';

  function visibleWatchSites(state) {
    return state.watchGeographySites.filter((site) =>
      state.activeWatchLayers.has(site.category) &&
      (state.activeRegion === 'all' || site.region === state.activeRegion)
    );
  }

  function ensureMap() {
    if (liveMap || !mapElement || typeof L === 'undefined') return;
    liveMap = L.map(mapElement, {
      center: [20, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(liveMap);
  }

  function mapIconForSeverity(severity) {
    const safeSeverity = ['critical', 'high', 'elevated', 'moderate'].includes(severity) ? severity : 'moderate';
    return L.divIcon({
      className: 'map-pin-icon',
      html: `<span class="map-pin map-pin--${safeSeverity}"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -16]
    });
  }

  function watchSiteIcon(category) {
    return L.divIcon({
      className: 'watch-site-icon',
      html: `<span class="watch-site-marker watch-site-marker--${category}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8]
    });
  }

  function renderMap(state, view, forceFit = false) {
    ensureMap();
    if (!liveMap) return;

    liveMarkers.forEach((marker) => marker.remove());
    watchSiteMarkers.forEach((marker) => marker.remove());
    liveMarkers = [];
    watchSiteMarkers = [];

    const items = view.filtered.filter((alert) => Number.isFinite(alert.lat) && Number.isFinite(alert.lng));
    const sites = visibleWatchSites(state);
    const signature = [
      items.map((alert) => `${alert.id}:${alert.lat.toFixed(3)},${alert.lng.toFixed(3)}`).join('|'),
      sites.map((site) => `${site.id}:${site.category}`).join('|')
    ].join('::');
    const bounds = [];

    items.forEach((alert) => {
      const marker = L.marker([alert.lat, alert.lng], {
        icon: mapIconForSeverity(alert.severity),
        keyboard: true,
        title: alert.title
      });
      marker.on('click', () => openDetail(alert));
      marker.addTo(liveMap);
      liveMarkers.push(marker);
      bounds.push([alert.lat, alert.lng]);
    });

    sites.forEach((site) => {
      const marker = L.marker([site.lat, site.lng], {
        icon: watchSiteIcon(site.category),
        keyboard: true,
        title: site.name
      });
      marker.bindPopup(`<div class="watch-site-popup"><strong>${site.name}</strong><p>${watchLayerLabels[site.category]} | ${site.note}</p></div>`);
      marker.addTo(liveMap);
      watchSiteMarkers.push(marker);
      bounds.push([site.lat, site.lng]);
    });

    mapSummary.textContent = `${view.responder.length} responder items | ${view.context.length} context | ${view.quarantine.length} quarantine | ${items.length} plotted alerts`;
    mapLayerSummary.textContent = `${sites.length} watch sites visible`;

    if (items.length && (forceFit || signature !== lastMapSignature)) {
      liveMap.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: items.length === 1 ? 6 : 5
      });
    } else if (!items.length && sites.length && (forceFit || signature !== lastMapSignature)) {
      liveMap.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: 5
      });
    } else if (!items.length && (forceFit || lastMapSignature)) {
      liveMap.setView([20, 10], 2);
    }

    lastMapSignature = signature;
    requestAnimationFrame(() => liveMap.invalidateSize());
  }

  function zoomMap(direction) {
    ensureMap();
    if (!liveMap) return;
    if (direction > 0) liveMap.zoomIn();
    if (direction < 0) liveMap.zoomOut();
  }

  function invalidateSize() {
    if (!liveMap) return;
    requestAnimationFrame(() => liveMap.invalidateSize());
  }

  return {
    ensureMap,
    renderMap,
    zoomMap,
    invalidateSize
  };
}
