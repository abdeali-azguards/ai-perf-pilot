import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatJson } from '../src/formatters/json.mjs';
import { formatMarkdown } from '../src/formatters/markdown.mjs';
import { formatTerminal } from '../src/formatters/terminal.mjs';

const mockAudit = {
  url: 'http://localhost:3000/',
  mode: 'mobile',
  timestamp: '2026-10-27T12:00:00.000Z',
  scores: { performance: 0.82, accessibility: 0.95, bestPractices: 0.92, seo: 1.0 },
  vitals: {
    lcp: { value: 2800, rating: 'needs-improvement', displayValue: '2.8 s' },
    tbt: { value: 120, rating: 'good', displayValue: '120 ms' },
    cls: { value: 0.02, rating: 'good', displayValue: '0.02' },
    fcp: { value: 1500, rating: 'good', displayValue: '1.5 s' },
    speedIndex: { value: 2100, rating: 'good', displayValue: '2.1 s' }
  },
  bottlenecks: [
    { title: 'Render-blocking resources', savingsMs: 420, details: ['main.css'] },
    { title: 'Largest Contentful Paint image was not preloaded', savingsMs: 650, details: ['hero.png'] }
  ]
};

describe('Formatters', () => {
  it('formats JSON with clean metrics structure and rounded scores', () => {
    const json = formatJson(mockAudit);
    assert.equal(json.url, 'http://localhost:3000/');
    assert.equal(json.scores.performance, 82);
    assert.equal(json.scores.accessibility, 95);
    assert.equal(json.vitals.lcp.value, 2800);
    assert.equal(json.vitals.lcp.rating, 'needs-improvement');
    assert.equal(json.bottlenecks.length, 2);
  });

  it('formats Markdown without any ANSI escape characters', () => {
    const md = formatMarkdown(mockAudit);
    assert.match(md, /### Performance Scorecard/);
    assert.match(md, /LCP/);
    assert.match(md, /Render-blocking resources/);
    assert.equal(/\x1b\[[0-9;]*m/.test(md), false, 'Markdown must not contain ANSI escape codes');
  });

  it('formats Terminal output with color badges and sections', () => {
    const term = formatTerminal(mockAudit);
    assert.match(term, /82/);
    assert.match(term, /Largest Contentful Paint/);
    // Terminal output should contain ANSI reset or escape codes
    assert.equal(/\x1b\[[0-9;]*m/.test(term), true, 'Terminal output must contain ANSI styling');
  });

  it('mentions the median and every run score when several runs were made', () => {
    const multi = { ...mockAudit, runs: { count: 3, performanceScores: [0.7, 0.82, 0.9] } };
    assert.match(formatMarkdown(multi), /Median of 3 runs \(performance: 70, 82, 90\)/);
    assert.match(formatTerminal(multi), /Median of 3 runs \(performance: 70, 82, 90\)/);
    assert.doesNotMatch(formatMarkdown(mockAudit), /Median of/);
  });
});
