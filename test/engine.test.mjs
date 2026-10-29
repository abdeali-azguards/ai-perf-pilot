import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMetricRating, normalizeAuditResults } from '../src/engine/lighthouse.mjs';

describe('Lighthouse metric normalization', () => {
  it('correctly categorizes LCP ratings', () => {
    assert.equal(getMetricRating('lcp', 1800), 'good');
    assert.equal(getMetricRating('lcp', 3200), 'needs-improvement');
    assert.equal(getMetricRating('lcp', 5000), 'poor');
  });

  it('correctly categorizes TBT ratings', () => {
    assert.equal(getMetricRating('tbt', 80), 'good');
    assert.equal(getMetricRating('tbt', 350), 'needs-improvement');
    assert.equal(getMetricRating('tbt', 900), 'poor');
  });

  it('correctly categorizes CLS ratings', () => {
    assert.equal(getMetricRating('cls', 0.04), 'good');
    assert.equal(getMetricRating('cls', 0.18), 'needs-improvement');
    assert.equal(getMetricRating('cls', 0.45), 'poor');
  });

  it('normalizes mock lhr object accurately', () => {
    const mockLhr = {
      categories: {
        performance: { score: 0.88 },
        accessibility: { score: 0.94 },
        'best-practices': { score: 0.90 },
        seo: { score: 1.0 },
      },
      audits: {
        'largest-contentful-paint': { numericValue: 2400, displayValue: '2.4 s' },
        'total-blocking-time': { numericValue: 150, displayValue: '150 ms' },
        'cumulative-layout-shift': { numericValue: 0.05, displayValue: '0.05' },
        'first-contentful-paint': { numericValue: 1200, displayValue: '1.2 s' },
        'speed-index': { numericValue: 1900, displayValue: '1.9 s' },
        'render-blocking-resources': {
          score: 0.5,
          title: 'Eliminate render-blocking resources',
          details: { overallSavingsMs: 380, items: [{ url: 'https://cdn.example.com/styles.css' }] },
        },
      },
    };

    const res = normalizeAuditResults(mockLhr, 'http://localhost:3000', 'mobile');
    assert.equal(res.scores.performance, 0.88);
    assert.equal(res.vitals.lcp.value, 2400);
    assert.equal(res.vitals.lcp.rating, 'good');
    assert.equal(res.bottlenecks.length, 1);
    assert.equal(res.bottlenecks[0].savingsMs, 380);
    assert.equal(res.bottlenecks[0].details[0], 'https://cdn.example.com/styles.css');
  });
});
