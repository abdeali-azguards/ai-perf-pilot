import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateThresholds } from '../src/engine/thresholds.mjs';

const make = (url, performance, lcp, tbt, cls) => ({
  url,
  scores: { performance },
  vitals: { lcp: { value: lcp }, tbt: { value: tbt }, cls: { value: cls } },
});

describe('evaluateThresholds', () => {
  it('returns no failures when everything is within limits', () => {
    const out = evaluateThresholds([make('http://a', 90, 2000, 100, 0.05)]);
    assert.deepEqual(out, []);
  });

  it('reports each metric that breaks its limit', () => {
    const out = evaluateThresholds([make('http://a', 70, 3000, 100, 0.3)]);
    assert.deepEqual(out.map((f) => f.metric), ['performance', 'lcp', 'cls']);
  });

  it('respects custom thresholds and skips unset ones', () => {
    const out = evaluateThresholds([make('http://a', 70, 9000, 900, 0.9)], { performance: 60 });
    assert.deepEqual(out, []);
  });

  it('skips metrics Lighthouse did not report', () => {
    const out = evaluateThresholds([{ url: 'http://a', scores: { performance: null }, vitals: {} }]);
    assert.deepEqual(out, []);
  });
});
