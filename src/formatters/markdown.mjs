import { formatJson } from './json.mjs';

/**
 * Format audit results into a token-efficient, compact Markdown scorecard.
 * Strictly avoids any ANSI terminal escape sequences.
 *
 * @param {object} audit
 * @returns {string}
 */
export function formatMarkdown(audit) {
  const data = formatJson(audit);

  const getEmoji = (rating) => {
    if (rating === 'good') return '🟢 Good';
    if (rating === 'needs-improvement') return '🟡 Needs Imp';
    if (rating === 'poor') return '🔴 Poor';
    return '⚪ —';
  };

  const getScoreEmoji = (score) => {
    if (score === null || score === undefined) return '—';
    if (score >= 90) return `🟢 ${score}`;
    if (score >= 50) return `🟡 ${score}`;
    return `🔴 ${score}`;
  };

  const lines = [
    `### Performance Scorecard: \`${data.url}\``,
    `*Mode: ${data.mode} | Timestamp: ${data.timestamp}*`,
    ...(data.runs ? [`*Median of ${data.runs.count} runs (performance: ${data.runs.performanceScores.join(', ')})*`] : []),
    '',
    '#### Overall Scores',
    '| Category | Score | Status |',
    '| :--- | :--- | :--- |',
    `| **Performance** | ${getScoreEmoji(data.scores.performance)} | ${data.scores.performance >= 90 ? 'Passing' : 'Action Required'} |`,
    `| **Accessibility** | ${getScoreEmoji(data.scores.accessibility)} | ${data.scores.accessibility >= 90 ? 'Passing' : 'Review Needed'} |`,
    `| **Best Practices** | ${getScoreEmoji(data.scores.bestPractices)} | ${data.scores.bestPractices >= 90 ? 'Passing' : 'Review Needed'} |`,
    `| **SEO** | ${getScoreEmoji(data.scores.seo)} | ${data.scores.seo >= 90 ? 'Passing' : 'Review Needed'} |`,
    '',
    '#### Core Web Vitals',
    '| Metric | Value | Target | Assessment |',
    '| :--- | :--- | :--- | :--- |',
    `| **LCP** (Largest Contentful Paint) | \`${data.vitals.lcp?.displayValue || 'N/A'}\` | <= 2.5s | ${getEmoji(data.vitals.lcp?.rating)} |`,
    `| **TBT** (Total Blocking Time) | \`${data.vitals.tbt?.displayValue || 'N/A'}\` | <= 200ms | ${getEmoji(data.vitals.tbt?.rating)} |`,
    `| **CLS** (Cumulative Layout Shift) | \`${data.vitals.cls?.displayValue || 'N/A'}\` | <= 0.1 | ${getEmoji(data.vitals.cls?.rating)} |`,
    `| **FCP** (First Contentful Paint) | \`${data.vitals.fcp?.displayValue || 'N/A'}\` | <= 1.8s | ${getEmoji(data.vitals.fcp?.rating)} |`,
    `| **Speed Index** | \`${data.vitals.speedIndex?.displayValue || 'N/A'}\` | <= 3.4s | ${getEmoji(data.vitals.speedIndex?.rating)} |`,
  ];

  if (data.bottlenecks && data.bottlenecks.length > 0) {
    lines.push('', '#### Top Actionable Bottlenecks');
    data.bottlenecks.forEach((b, idx) => {
      const savings = b.savingsMs ? ` (est. ~${b.savingsMs}ms savings)` : '';
      lines.push(`${idx + 1}. **${b.title}**${savings}`);
      if (b.details && b.details.length > 0) {
        b.details.slice(0, 5).forEach((d) => {
          lines.push(`   - \`${d}\``);
        });
      }
    });
  }

  return lines.join('\n');
}
