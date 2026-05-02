import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('the app shell no longer references Leaflet assets', () => {
  const map = readFileSync(new URL('../shared/map-watch.mjs', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.ok(!map.includes('leaflet'), 'shared/map-watch.mjs should not reference Leaflet');
  assert.ok(!index.includes('leaflet'), 'index.html should not reference Leaflet assets');
});

test('vendored Leaflet assets have been removed from the repository', () => {
  assert.equal(existsSync(new URL('../assets/vendor/leaflet/leaflet.css', import.meta.url)), false);
  assert.equal(existsSync(new URL('../assets/vendor/leaflet/leaflet.js', import.meta.url)), false);
  assert.equal(existsSync(new URL('../assets/vendor/leaflet/LICENSE', import.meta.url)), false);
});
