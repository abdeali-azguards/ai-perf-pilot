import { formatJson } from './json.mjs';

const c = {
  reset: '\x1b[0m',
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`,
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
};

function formatScore(score) {
  if (score === null || score === undefined) return c.dim('N/A');
  if (score >= 90) return c.green(c.bold(`${score}`));
  if (score >= 50) return c.yellow(c.bold(`${score}`));
  return c.red(c.bold(`${score}`));
}

function formatRating(rating) {
  if (rating === 'good') return c.green('GOOD');
  if (rating === 'needs-improvement') return c.yellow('NEEDS IMP');
  if (rating === 'poor') return c.red('POOR');
  return c.dim('—');
}

/**
 * Format audit results into colored ANSI terminal output for humans.
 *
 * @param {object} audit
 * @returns {string}
 */
export function formatTerminal(audit) {
  const data = formatJson(audit);

  const lines = [
    '',
    c.bold(`⚡ Performance Audit: ${c.cyan(data.url)} [${data.mode}]`),
    c.dim(`Generated: ${data.timestamp}`),
    '',
    c.bold('── Overall Scores ──'),
    `  Performance:     ${formatScore(data.scores.performance)}`,
    `  Accessibility:   ${formatScore(data.scores.accessibility)}`,
    `  Best Practices:  ${formatScore(data.scores.bestPractices)}`,
    `  SEO:             ${formatScore(data.scores.seo)}`,
    '',
    c.bold('── Core Web Vitals ──'),
    `  LCP (Largest Contentful Paint): ${c.bold(data.vitals.lcp?.displayValue || 'N/A')} [${formatRating(data.vitals.lcp?.rating)}]`,
    `  TBT (Total Blocking Time):       ${c.bold(data.vitals.tbt?.displayValue || 'N/A')} [${formatRating(data.vitals.tbt?.rating)}]`,
    `  CLS (Cumulative Layout Shift):   ${c.bold(data.vitals.cls?.displayValue || 'N/A')} [${formatRating(data.vitals.cls?.rating)}]`,
    `  FCP (First Contentful Paint):    ${c.bold(data.vitals.fcp?.displayValue || 'N/A')} [${formatRating(data.vitals.fcp?.rating)}]`,
    `  Speed Index:                     ${c.bold(data.vitals.speedIndex?.displayValue || 'N/A')} [${formatRating(data.vitals.speedIndex?.rating)}]`,
  ];

  if (data.bottlenecks && data.bottlenecks.length > 0) {
    lines.push('', c.bold('── Top Actionable Optimization Targets ──'));
    data.bottlenecks.forEach((b, idx) => {
      const savings = b.savingsMs ? c.yellow(` (est. ~${b.savingsMs}ms delay)`) : '';
      lines.push(`  ${idx + 1}. ${c.bold(b.title)}${savings}`);
      if (b.details && b.details.length > 0) {
        b.details.slice(0, 5).forEach((d) => {
          lines.push(c.dim(`     ↳ ${d}`));
        });
      }
    });
  }

  lines.push('');
  return lines.join('\n');
}
