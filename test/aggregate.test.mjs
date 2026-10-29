import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickMedianRun } from '../src/engine/aggregate.mjs';
import { formatJson } from '../src/formatters/json.mjs';

const run = (performance, lcp, tag) => ({
  url: 'http://a',
  mode: 'mobile',
  tag,
  scores: { performance },
  vitals: { lcp: { value: lcp } },
  bottlenecks: [],
});

describe('pickMedianRun', () => {
  it('returns a single run untouched, with no runs summary', () => {
    const only = run(0.9, 2000, 'only');
    assert.equal(pickMedianRun([only]), only);
  });

  it('picks the run with the median performance score', () => {
    const out = pickMedianRun([run(0.95, 1800, 'high'), run(0.7, 3000, 'low'), run(0.85, 2400, 'mid')]);
    assert.equal(out.tag, 'mid');
  });

  it('records every run score in the order the runs happened', () => {
    const out = pickMedianRun([run(0.95, 1800, 'a'), run(0.7, 3000, 'b'), run(0.85, 2400, 'c')]);
    assert.deepEqual(out.runs, { count: 3, performanceScores: [0.95, 0.7, 0.85] });
  });

  it('takes the lower middle run when the count is even, so gates stay conservative', () => {
    const out = pickMedianRun([run(0.9, 2000, 'a'), run(0.6, 3500, 'b')]);
    assert.equal(out.tag, 'b');
  });

  it('breaks score ties by LCP and tolerates missing scores', () => {
    const tie = pickMedianRun([run(0.9, 3000, 'slow'), run(0.9, 1000, 'fast'), run(0.9, 2000, 'mid')]);
    assert.equal(tie.tag, 'mid');

    const missing = pickMedianRun([run(null, null, 'none'), run(0.8, 2000, 'ok'), run(0.9, 1500, 'best')]);
    assert.equal(missing.tag, 'ok');
  });

  it('throws on an empty list', () => {
    assert.throws(() => pickMedianRun([]), /at least one/);
  });

  it('does not mutate the input runs', () => {
    const a = run(0.9, 2000, 'a');
    const b = run(0.7, 3000, 'b');
    pickMedianRun([a, b]);
    assert.equal(a.runs, undefined);
    assert.equal(b.runs, undefined);
  });
});

describe('formatJson with runs', () => {
  it('reports run scores on the 0-100 scale only when several runs were made', () => {
    const multi = pickMedianRun([run(0.95, 1800, 'a'), run(0.7, 3000, 'b'), run(0.85, 2400, 'c')]);
    assert.deepEqual(formatJson(multi).runs, { count: 3, performanceScores: [95, 70, 85] });
    assert.equal('runs' in formatJson(run(0.9, 2000, 'x')), false);
  });
});
