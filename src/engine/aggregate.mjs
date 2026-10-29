/**
 * Choose the representative run from several audits of the same page: the one
 * with the median performance score. Using a whole real run (rather than a
 * median of each metric) keeps its bottleneck list consistent with its numbers.
 *
 * Runs are ordered worst to best by performance score, then by LCP. With an
 * even count the lower middle run is chosen, which keeps threshold checks
 * conservative.
 *
 * @param {object[]} audits - Normalized audit results, in the order they ran
 * @returns {object} The chosen run. With more than one run it carries
 *   `runs: { count, performanceScores }` (raw 0-1 scores, in run order).
 */
export function pickMedianRun(audits) {
  if (!Array.isArray(audits) || audits.length === 0) {
    throw new Error('pickMedianRun needs at least one audit result');
  }
  if (audits.length === 1) return audits[0];

  const score = (a) => a.scores?.performance ?? -1;
  const lcp = (a) => a.vitals?.lcp?.value ?? 0;

  const worstToBest = [...audits].sort((a, b) => score(a) - score(b) || lcp(b) - lcp(a));
  const chosen = worstToBest[Math.floor((audits.length - 1) / 2)];

  return {
    ...chosen,
    runs: {
      count: audits.length,
      performanceScores: audits.map((a) => a.scores?.performance ?? null),
    },
  };
}
