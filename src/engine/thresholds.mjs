export const DEFAULT_THRESHOLDS = {
  performance: 85,
  lcp: 2500,
  tbt: 200,
  cls: 0.1,
};

/**
 * Compare formatted audit results (see formatJson) against thresholds.
 * `performance` is a minimum score; `lcp`, `tbt` and `cls` are maximum values.
 * Metrics that Lighthouse did not report are skipped.
 *
 * @param {object[]} results - Output of formatJson, one per audited URL
 * @param {object} [thresholds]
 * @returns {{ url: string, metric: string, actual: number, limit: number }[]}
 */
export function evaluateThresholds(results, thresholds = DEFAULT_THRESHOLDS) {
  const failures = [];

  for (const r of results) {
    const perf = r.scores?.performance;
    if (thresholds.performance != null && perf != null && perf < thresholds.performance) {
      failures.push({ url: r.url, metric: 'performance', actual: perf, limit: thresholds.performance });
    }

    for (const metric of ['lcp', 'tbt', 'cls']) {
      const limit = thresholds[metric];
      const actual = r.vitals?.[metric]?.value;
      if (limit != null && actual != null && actual > limit) {
        failures.push({ url: r.url, metric, actual, limit });
      }
    }
  }

  return failures;
}
