import lighthouse from 'lighthouse';

/**
 * Determine rating for Core Web Vitals based on official Google thresholds.
 *
 * @param {string} metricKey
 * @param {number} value
 * @returns {'good' | 'needs-improvement' | 'poor'}
 */
export function getMetricRating(metricKey, value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'good';
  }

  switch (metricKey) {
    case 'lcp': // <= 2.5s / <= 4.0s
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'tbt': // <= 200ms / <= 600ms
      if (value <= 200) return 'good';
      if (value <= 600) return 'needs-improvement';
      return 'poor';
    case 'cls': // <= 0.1 / <= 0.25
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'fcp': // <= 1.8s / <= 3.0s
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    case 'speedIndex': // <= 3.4s / <= 5.8s
      if (value <= 3400) return 'good';
      if (value <= 5800) return 'needs-improvement';
      return 'poor';
    default:
      return 'good';
  }
}

/**
 * Normalize raw Lighthouse Result (lhr) into clean AuditData format.
 *
 * @param {object} lhr - Lighthouse result
 * @param {string} url - Target URL
 * @param {'mobile' | 'desktop'} mode
 * @returns {object}
 */
export function normalizeAuditResults(lhr, url, mode = 'mobile') {
  const cats = lhr.categories || {};
  const audits = lhr.audits || {};

  const lcpVal = audits['largest-contentful-paint']?.numericValue;
  const tbtVal = audits['total-blocking-time']?.numericValue;
  const clsVal = audits['cumulative-layout-shift']?.numericValue;
  const fcpVal = audits['first-contentful-paint']?.numericValue;
  const siVal = audits['speed-index']?.numericValue;

  // Extract bottlenecks (opportunities + diagnostics)
  const bottlenecks = [];
  const candidateAudits = [
    'render-blocking-resources',
    'unused-javascript',
    'unused-css-rules',
    'modern-image-formats',
    'offscreen-images',
    'unminified-javascript',
    'unminified-css',
    'server-response-time',
    'uses-long-cache-ttl',
    'largest-contentful-paint-element',
  ];

  for (const id of candidateAudits) {
    const item = audits[id];
    if (!item) continue;

    const savingsMs = item.details?.overallSavingsMs || null;
    const savingsBytes = item.details?.overallSavingsBytes || null;
    const score = item.score;

    if ((score !== null && score < 0.9) || savingsMs > 50 || savingsBytes > 10240) {
      const details = [];
      if (item.details?.items && Array.isArray(item.details.items)) {
        for (const it of item.details.items.slice(0, 5)) {
          if (it.url) {
            details.push(it.url);
          } else if (it.node?.snippet) {
            details.push(it.node.snippet);
          }
        }
      }

      bottlenecks.push({
        id,
        title: item.title,
        description: item.description,
        savingsMs: savingsMs ? Math.round(savingsMs) : null,
        savingsBytes: savingsBytes ? Math.round(savingsBytes) : null,
        details,
      });
    }
  }

  // Sort bottlenecks by estimated ms savings descending
  bottlenecks.sort((a, b) => (b.savingsMs || 0) - (a.savingsMs || 0));

  return {
    url,
    mode,
    timestamp: new Date().toISOString(),
    scores: {
      performance: cats.performance?.score ?? null,
      accessibility: cats.accessibility?.score ?? null,
      bestPractices: cats['best-practices']?.score ?? null,
      seo: cats.seo?.score ?? null,
    },
    vitals: {
      lcp: {
        value: lcpVal !== undefined ? Math.round(lcpVal) : null,
        displayValue: audits['largest-contentful-paint']?.displayValue || `${(lcpVal / 1000).toFixed(2)} s`,
        rating: getMetricRating('lcp', lcpVal),
      },
      tbt: {
        value: tbtVal !== undefined ? Math.round(tbtVal) : null,
        displayValue: audits['total-blocking-time']?.displayValue || `${Math.round(tbtVal)} ms`,
        rating: getMetricRating('tbt', tbtVal),
      },
      cls: {
        value: clsVal !== undefined ? Number(clsVal.toFixed(3)) : null,
        displayValue: audits['cumulative-layout-shift']?.displayValue || `${clsVal?.toFixed(3)}`,
        rating: getMetricRating('cls', clsVal),
      },
      fcp: {
        value: fcpVal !== undefined ? Math.round(fcpVal) : null,
        displayValue: audits['first-contentful-paint']?.displayValue || `${(fcpVal / 1000).toFixed(2)} s`,
        rating: getMetricRating('fcp', fcpVal),
      },
      speedIndex: {
        value: siVal !== undefined ? Math.round(siVal) : null,
        displayValue: audits['speed-index']?.displayValue || `${(siVal / 1000).toFixed(2)} s`,
        rating: getMetricRating('speedIndex', siVal),
      },
    },
    bottlenecks,
  };
}

/**
 * Execute a Lighthouse audit on target URL.
 *
 * @param {string} url - Web page URL to audit
 * @param {object} [options={}]
 * @param {number} options.port - Chrome debugging port
 * @param {boolean} [options.desktop=false] - Use desktop settings
 * @param {number} [options.timeoutMs=30000] - Navigation timeout
 * @returns {Promise<object>} Normalized audit results
 */
export async function runLighthouse(url, options = {}) {
  const isDesktop = Boolean(options.desktop);
  const flags = {
    port: options.port,
    output: 'json',
    logLevel: options.logLevel || 'silent',
    maxWaitForLoad: options.timeoutMs || 30000,
  };

  if (isDesktop) {
    flags.formFactor = 'desktop';
    flags.screenEmulation = {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    };
    flags.throttling = {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    };
  }

  try {
    const runnerResult = await lighthouse(url, flags);
    if (!runnerResult || !runnerResult.lhr) {
      throw new Error(`Lighthouse did not produce results for ${url}`);
    }
    return normalizeAuditResults(runnerResult.lhr, url, isDesktop ? 'desktop' : 'mobile');
  } catch (err) {
    if (err.message && (err.message.includes('DNS_PROBE_FINISHED_NXDOMAIN') || err.message.includes('ECONNREFUSED'))) {
      throw new Error(`Failed to connect to ${url}. Ensure your web server is running and accessible.`);
    }
    if (err.message && err.message.includes('PAGE_HUNG')) {
      throw new Error(`Audit timed out after 30s loading ${url}. Check for infinite loops or blocked scripts.`);
    }
    throw err;
  }
}
