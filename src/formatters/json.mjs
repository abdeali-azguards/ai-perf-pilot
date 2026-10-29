/**
 * Format audit results into a structured, machine-readable JSON object.
 *
 * @param {object} audit
 * @returns {object}
 */
export function formatJson(audit) {
  const roundScore = (s) => (s !== undefined && s !== null ? Math.round(s * 100) : null);

  const result = {
    url: audit.url,
    mode: audit.mode || 'mobile',
    timestamp: audit.timestamp || new Date().toISOString(),
    scores: {
      performance: roundScore(audit.scores?.performance),
      accessibility: roundScore(audit.scores?.accessibility),
      bestPractices: roundScore(audit.scores?.bestPractices),
      seo: roundScore(audit.scores?.seo),
    },
    vitals: {
      lcp: audit.vitals?.lcp || null,
      tbt: audit.vitals?.tbt || null,
      cls: audit.vitals?.cls || null,
      fcp: audit.vitals?.fcp || null,
      speedIndex: audit.vitals?.speedIndex || null,
    },
    bottlenecks: audit.bottlenecks || [],
  };

  if (audit.runs) {
    result.runs = {
      count: audit.runs.count,
      performanceScores: audit.runs.performanceScores.map(roundScore),
    };
  }

  return result;
}
