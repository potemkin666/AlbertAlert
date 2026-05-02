import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  _buildLocationGroups,
  _buildSummaryItems,
  _countryLabelFromAlert,
  _normaliseCountryName,
  _renderLocationsMarkup,
  _statusLine,
  _topSeverity
} from '../shared/map-watch.mjs';
import { MAP_VIEW_MODES, NEARBY_RADIUS_KM } from '../shared/ui-constants.mjs';

describe('location aliases', () => {
  it('normalises UK aliases to United Kingdom', () => {
    assert.equal(_normaliseCountryName('uk'), 'United Kingdom');
    assert.equal(_normaliseCountryName('Britain'), 'United Kingdom');
  });

  it('derives the country from a comma-separated location', () => {
    assert.equal(_countryLabelFromAlert({ location: 'Soho, London, UK' }), 'United Kingdom');
  });
});

describe('location groups', () => {
  const alerts = [
    { id: '1', title: 'A', location: 'Berlin, Germany', severity: 'high' },
    { id: '2', title: 'B', location: 'Munich, Germany', severity: 'moderate' },
    { id: '3', title: 'C', location: 'Paris, France', severity: 'critical' }
  ];

  it('groups world mode alerts by country', () => {
    const groups = _buildLocationGroups(alerts, MAP_VIEW_MODES.world);
    assert.deepEqual(groups.map((group) => [group.label, group.alerts.length]), [
      ['Germany', 2],
      ['France', 1]
    ]);
  });

  it('groups nearby mode alerts by local area', () => {
    const groups = _buildLocationGroups(alerts, MAP_VIEW_MODES.nearby);
    assert.deepEqual(groups.map((group) => group.label), ['Berlin', 'Munich', 'Paris']);
  });

  it('orders groups by alert count before severity', () => {
    const groups = _buildLocationGroups(alerts, MAP_VIEW_MODES.world);
    assert.equal(groups[0].label, 'Germany');
    assert.equal(groups[1].severity, 'critical');
  });
});

describe('locations panel summaries', () => {
  it('reports nearby fallback status when user location is unavailable', () => {
    assert.equal(_statusLine(MAP_VIEW_MODES.nearby, 4, false), '4 alerts shown until location is available');
  });

  it('includes nearby radius in the summary chips', () => {
    const summary = _buildSummaryItems(
      [{ id: '1', severity: 'elevated' }],
      [{ label: 'Camden', alerts: [{ id: '1', severity: 'elevated' }] }],
      { userLocation: { lat: 51.5, lng: -0.1 } },
      MAP_VIEW_MODES.nearby
    );
    assert.equal(summary.at(-1)?.value, `${NEARBY_RADIUS_KM} km radius`);
  });

  it('tracks the highest severity across visible alerts', () => {
    assert.equal(_topSeverity([{ severity: 'moderate' }, { severity: 'critical' }]), 'critical');
  });
});

describe('locations panel markup', () => {
  it('renders open-detail buttons instead of popup markup', () => {
    const html = _renderLocationsMarkup({
      alerts: [
        {
          id: 'x1',
          title: 'Bridge closure',
          location: 'Tower Bridge, London',
          source: 'TfL',
          time: '09:30',
          severity: 'high'
        }
      ],
      groups: [
        {
          label: 'Tower Bridge',
          kicker: 'Area',
          severity: 'high',
          alerts: [
            {
              id: 'x1',
              title: 'Bridge closure',
              location: 'Tower Bridge, London',
              source: 'TfL',
              time: '09:30',
              severity: 'high'
            }
          ]
        }
      ],
      state: {},
      mode: MAP_VIEW_MODES.london
    });

    assert.ok(html.includes('data-open-detail="x1"'));
    assert.ok(html.includes('Locations overview'));
    assert.ok(!html.includes('leaflet'));
  });
});
