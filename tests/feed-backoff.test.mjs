import test from 'node:test';
import assert from 'node:assert/strict';

import { nextBackoffDelay } from '../app/feed/index.mjs';

test('nextBackoffDelay returns base delay for zero consecutive failures', () => {
  const d = nextBackoffDelay(5000, 0, 120_000, 0);
  assert.equal(d, 5000);
});

test('nextBackoffDelay doubles per consecutive failure', () => {
  const d1 = nextBackoffDelay(5000, 1, 120_000, 0);
  assert.equal(d1, 10_000);
  const d2 = nextBackoffDelay(5000, 2, 120_000, 0);
  assert.equal(d2, 20_000);
  const d3 = nextBackoffDelay(5000, 3, 120_000, 0);
  assert.equal(d3, 40_000);
});

test('nextBackoffDelay caps at maxMs', () => {
  const d = nextBackoffDelay(5000, 10, 120_000, 0);
  assert.equal(d, 120_000);
});

test('nextBackoffDelay with jitter stays within ±jitterRatio of raw', () => {
  const base = 5000;
  const failures = 2;
  const maxMs = 120_000;
  const jitterRatio = 0.25;
  const raw = Math.min(base * Math.pow(2, failures), maxMs);

  for (let i = 0; i < 100; i++) {
    const d = nextBackoffDelay(base, failures, maxMs, jitterRatio);
    assert.ok(d >= Math.round(raw * (1 - jitterRatio)),
      `delay ${d} should be >= ${Math.round(raw * (1 - jitterRatio))}`);
    assert.ok(d <= Math.round(raw * (1 + jitterRatio)),
      `delay ${d} should be <= ${Math.round(raw * (1 + jitterRatio))}`);
  }
});

test('nextBackoffDelay never returns negative', () => {
  for (let i = 0; i < 100; i++) {
    const d = nextBackoffDelay(100, 0, 120_000, 0.5);
    assert.ok(d >= 0, `delay ${d} should be >= 0`);
  }
});

test('nextBackoffDelay with very large failure count still caps at maxMs', () => {
  const d = nextBackoffDelay(5000, 50, 120_000, 0);
  assert.equal(d, 120_000);
});

test('nextBackoffDelay uses default maxMs and jitterRatio when not provided', () => {
  // Just verify it doesn't throw and returns a positive number
  const d = nextBackoffDelay(5000, 3);
  assert.ok(d > 0, `delay ${d} should be positive`);
  assert.ok(d <= 120_000 * 1.25 + 1, `delay ${d} should not exceed max with jitter`);
});
