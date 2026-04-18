import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dailyBriefingQuote } from '../shared/persistence-ui.mjs';

describe('dailyBriefingQuote', () => {
  const sampleQuotes = [
    'Quote zero',
    'Quote one',
    'Quote two',
    'Quote three',
    'Quote four'
  ];

  it('returns empty string when quotes array is empty', () => {
    assert.equal(dailyBriefingQuote([]), '');
  });

  it('returns empty string when quotes is null or undefined', () => {
    assert.equal(dailyBriefingQuote(null), '');
    assert.equal(dailyBriefingQuote(undefined), '');
  });

  it('returns a quote from the array', () => {
    const result = dailyBriefingQuote(sampleQuotes);
    assert.ok(sampleQuotes.includes(result), `expected one of the sample quotes, got: ${result}`);
  });

  it('returns the same quote for the same day', () => {
    const date = new Date('2026-03-15T10:00:00Z');
    const first = dailyBriefingQuote(sampleQuotes, date);
    const second = dailyBriefingQuote(sampleQuotes, date);
    assert.equal(first, second, 'same day should produce the same quote');
  });

  it('returns different quotes for different days (most of the time)', () => {
    const day1 = new Date('2026-01-01T07:00:00Z');
    const day2 = new Date('2026-01-02T07:00:00Z');
    const q1 = dailyBriefingQuote(sampleQuotes, day1);
    const q2 = dailyBriefingQuote(sampleQuotes, day2);
    // Day 0 → index 0, Day 1 → index 1
    assert.notEqual(q1, q2, 'consecutive days should produce different quotes');
  });

  it('wraps around when dayOfYear exceeds quotes length', () => {
    // Day 365 in a non-leap year with 5 quotes → 365 % 5 = 0
    const late = new Date('2026-12-31T12:00:00Z');
    const result = dailyBriefingQuote(sampleQuotes, late);
    assert.ok(sampleQuotes.includes(result), 'wrap-around should still produce a valid quote');
  });

  it('returns the first quote on Jan 1', () => {
    const jan1 = new Date('2026-01-01T00:00:00Z');
    const result = dailyBriefingQuote(sampleQuotes, jan1);
    assert.equal(result, 'Quote zero', 'Jan 1 (day 0) should map to index 0');
  });

  it('returns the second quote on Jan 2', () => {
    const jan2 = new Date('2026-01-02T00:00:00Z');
    const result = dailyBriefingQuote(sampleQuotes, jan2);
    assert.equal(result, 'Quote one', 'Jan 2 (day 1) should map to index 1');
  });

  it('works with a single-element array', () => {
    const result = dailyBriefingQuote(['Only one']);
    assert.equal(result, 'Only one');
  });
});

describe('daily-briefing-quotes.json', () => {
  it('contains at least 30 quotes', async () => {
    const { default: quotes } = await import('../shared/daily-briefing-quotes.json', { with: { type: 'json' } });
    assert.ok(Array.isArray(quotes), 'should be an array');
    assert.ok(quotes.length >= 30, `expected >=30 quotes, got ${quotes.length}`);
  });

  it('every entry is a non-empty string', async () => {
    const { default: quotes } = await import('../shared/daily-briefing-quotes.json', { with: { type: 'json' } });
    for (const q of quotes) {
      assert.equal(typeof q, 'string');
      assert.ok(q.trim().length > 0, 'quote should not be empty or whitespace-only');
    }
  });

  it('has no duplicate quotes', async () => {
    const { default: quotes } = await import('../shared/daily-briefing-quotes.json', { with: { type: 'json' } });
    const unique = new Set(quotes);
    assert.equal(unique.size, quotes.length, 'all quotes should be unique');
  });
});
