import test from 'node:test';
import assert from 'node:assert/strict';

import { createMidRunGuardrail } from '../scripts/build-live-feed.mjs';

function makeGuardrail(overrides = {}) {
  return createMidRunGuardrail({
    runStartedAtMs: Date.now(),
    maxRuntimeMs: 720_000,       // 12 minutes
    maxFailedRate: 0.65,
    runtimeWarningRatio: 0.8,
    failureRateWarningRatio: 0.6,
    minSourcesForRateCheck: 6,
    baseConcurrency: 4,
    baseStaggerMs: 60,
    baseStaggerJitterMs: 90,
    fastFailTimeoutMs: 5000,
    ...overrides
  });
}

function successStat(id = 'src-1') {
  return { id, built: 2, errors: 0 };
}

function failStat(id = 'src-1') {
  return { id, built: 0, errors: 1 };
}

test('createMidRunGuardrail returns level 0 with no sources processed', () => {
  const g = makeGuardrail();
  const state = g.evaluate();
  assert.equal(state.concurrency, 4);
  assert.equal(state.staggerMs, 60);
  assert.equal(state.staggerJitterMs, 90);
  assert.equal(state.timeoutOverrideMs, null);
  assert.equal(state.skipPlaywright, false);
  assert.equal(state.criticalOnly, false);
  assert.equal(state.shouldAbort, false);
});

test('createMidRunGuardrail snapshot starts clean', () => {
  const g = makeGuardrail();
  const snap = g.snapshot();
  assert.equal(snap.throttleLevel, 0);
  assert.equal(snap.totalAttempted, 0);
  assert.equal(snap.totalFailed, 0);
  assert.equal(snap.failedRate, 0);
  assert.deepEqual(snap.transitions, []);
});

test('recordBatch tracks successes and failures correctly', () => {
  const g = makeGuardrail();
  g.recordBatch([successStat('a'), successStat('b'), failStat('c')]);
  const snap = g.snapshot();
  assert.equal(snap.totalAttempted, 3);
  assert.equal(snap.totalFailed, 1);
  assert.ok(Math.abs(snap.failedRate - 0.333) < 0.01);
});

test('failure rate below warning ratio keeps level 0', () => {
  const g = makeGuardrail();
  // 6 sources, 2 failed = 33% < 60% of 65% = 39%
  g.recordBatch([
    successStat('a'), successStat('b'), successStat('c'),
    successStat('d'), failStat('e'), failStat('f')
  ]);
  const state = g.evaluate();
  assert.equal(state.concurrency, 4);
  assert.equal(state.timeoutOverrideMs, null);
  assert.equal(state.criticalOnly, false);
});

test('failure rate above warning ratio (60% of max) triggers level 1', () => {
  const g = makeGuardrail();
  // 6 sources, 3 failed = 50% > 39% (60% of 65%)
  g.recordBatch([
    successStat('a'), successStat('b'), successStat('c'),
    failStat('d'), failStat('e'), failStat('f')
  ]);
  const state = g.evaluate();
  assert.equal(state.concurrency, 3, 'concurrency reduced by 1');
  assert.equal(state.staggerMs, 90, 'stagger increased to 1.5x');
  assert.equal(state.timeoutOverrideMs, null, 'no timeout override at level 1');
  assert.equal(state.criticalOnly, false, 'not critical-only at level 1');
  assert.equal(state.skipPlaywright, false, 'playwright not skipped at level 1');
});

test('failure rate exceeding max triggers level 2 (fast-fail)', () => {
  const g = makeGuardrail();
  // 6 sources, 5 failed = 83% > 65%
  g.recordBatch([
    successStat('a'), failStat('b'), failStat('c'),
    failStat('d'), failStat('e'), failStat('f')
  ]);
  const state = g.evaluate();
  assert.equal(state.concurrency, 2, 'concurrency halved');
  assert.equal(state.staggerMs, 180, 'stagger tripled');
  assert.equal(state.staggerJitterMs, 180, 'jitter doubled');
  assert.equal(state.timeoutOverrideMs, 5000, 'fast-fail timeout applied');
  assert.equal(state.criticalOnly, true, 'critical-only mode');
  assert.equal(state.skipPlaywright, true, 'playwright skipped');
});

test('throttle level never de-escalates within a run', () => {
  const g = makeGuardrail();
  // Push to level 2
  g.recordBatch([
    successStat('a'), failStat('b'), failStat('c'),
    failStat('d'), failStat('e'), failStat('f')
  ]);
  g.evaluate();

  // Now add all successes — level should stay at 2
  g.recordBatch([
    successStat('g'), successStat('h'), successStat('i'),
    successStat('j'), successStat('k'), successStat('l')
  ]);
  const state = g.evaluate();
  assert.equal(state.concurrency, 2, 'stays at level 2');
  assert.equal(state.criticalOnly, true, 'stays critical-only');
  assert.equal(state.skipPlaywright, true, 'stays playwright-skipped');
});

test('runtime at 80%+ of guardrail triggers level 2', () => {
  // Start run 10 minutes ago, with 12-minute guardrail = 83% elapsed
  const g = makeGuardrail({ runStartedAtMs: Date.now() - 10 * 60_000 });
  g.recordBatch([successStat('a')]); // need some data
  const state = g.evaluate();
  assert.equal(state.criticalOnly, true, 'runtime pressure triggers fast-fail');
  assert.equal(state.timeoutOverrideMs, 5000);
});

test('runtime at 95%+ of guardrail sets shouldAbort', () => {
  // Start run 11.5 minutes ago, with 12-minute guardrail = 95.8%
  const g = makeGuardrail({ runStartedAtMs: Date.now() - 11.5 * 60_000 });
  const state = g.evaluate();
  assert.equal(state.shouldAbort, true, 'should abort at 95%');
});

test('failure rate check needs minSourcesForRateCheck', () => {
  const g = makeGuardrail({ minSourcesForRateCheck: 6 });
  // 3 out of 4 failed = 75% but only 4 attempted < 6 min
  g.recordBatch([successStat('a'), failStat('b'), failStat('c'), failStat('d')]);
  const state = g.evaluate();
  assert.equal(state.concurrency, 4, 'not throttled — too few samples');
  assert.equal(state.criticalOnly, false);
});

test('snapshot transitions log records escalations', () => {
  const g = makeGuardrail();
  // Trigger level 1
  g.recordBatch([
    successStat('a'), successStat('b'), successStat('c'),
    failStat('d'), failStat('e'), failStat('f')
  ]);
  g.evaluate();
  // Trigger level 2
  g.recordBatch([failStat('g'), failStat('h'), failStat('i')]);
  g.evaluate();

  const snap = g.snapshot();
  assert.equal(snap.transitions.length, 2);
  assert.equal(snap.transitions[0].level, 1);
  assert.equal(snap.transitions[1].level, 2);
});

test('elapsedMs returns positive value', () => {
  const g = makeGuardrail({ runStartedAtMs: Date.now() - 5000 });
  assert.ok(g.elapsedMs() >= 4900, 'elapsed should be >= ~5000ms');
});

test('baseConcurrency of 1 does not go below 1', () => {
  const g = makeGuardrail({ baseConcurrency: 1 });
  // Trigger level 2
  g.recordBatch([failStat('a'), failStat('b'), failStat('c'), failStat('d'), failStat('e'), failStat('f')]);
  const state = g.evaluate();
  assert.equal(state.concurrency, 1, 'cannot go below 1');
});
