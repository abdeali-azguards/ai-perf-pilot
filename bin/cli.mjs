#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { checkServerReachable, launchChrome } from '../src/engine/launcher.mjs';
import { runLighthouse } from '../src/engine/lighthouse.mjs';
import { fetchSitemapRoutes, mergeRoutes } from '../src/engine/sitemap.mjs';
import { DEFAULT_THRESHOLDS, evaluateThresholds } from '../src/engine/thresholds.mjs';
import { formatJson } from '../src/formatters/json.mjs';
import { formatMarkdown } from '../src/formatters/markdown.mjs';
import { formatTerminal } from '../src/formatters/terminal.mjs';
import { scaffoldProject } from './init.mjs';

const __filename = fileURLToPath(import.meta.url);

/**
 * Parse CLI arguments into structured configuration.
 *
 * @param {string[]} [rawArgs] - Array of CLI arguments (defaults to process.argv.slice(2))
 * @returns {object}
 */
export function parseCliArgs(rawArgs = process.argv.slice(2)) {
  const options = {
    url: { type: 'string' },
    desktop: { type: 'boolean', default: false },
    format: { type: 'string', default: 'terminal' },
    site: { type: 'boolean', default: false },
    limit: { type: 'string' },
    'output-dir': { type: 'string', default: '.perf-reports' },
    check: { type: 'boolean', default: false },
    'fail-under': { type: 'string' },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
  };

  const parsed = parseArgs({
    args: rawArgs,
    options,
    allowPositionals: true,
    strict: false,
  });

  const positionals = parsed.positionals || [];
  let command = positionals[0] || 'audit';

  if (command === 'init' || command === 'setup') {
    return { command: 'init', force: Boolean(parsed.values.force) };
  }

  if (parsed.values.help || command === 'help') {
    return { command: 'help' };
  }

  const limitNum = parsed.values.limit ? parseInt(parsed.values.limit, 10) : (parsed.values.site ? 5 : null);
  const failUnder = parsed.values['fail-under'] !== undefined ? Number(parsed.values['fail-under']) : null;

  return {
    command: 'audit',
    // Left undefined when --url is absent so perf.config.mjs can supply baseUrl.
    url: parsed.values.url,
    desktop: Boolean(parsed.values.desktop),
    format: parsed.values.format || 'terminal',
    site: Boolean(parsed.values.site),
    limit: limitNum,
    outputDir: parsed.values['output-dir'] || '.perf-reports',
    check: Boolean(parsed.values.check) || failUnder !== null,
    failUnder: Number.isFinite(failUnder) ? failUnder : null,
  };
}

function printHelp() {
  console.log(`
⚡ @azguards/ai-perf-pilot — Autonomous Web Performance & Core Web Vitals Engine

Usage:
  npx @azguards/ai-perf-pilot init        Scaffold AI skill and project config
  npx perf-pilot audit [options]          Audit live URL or site

Audit options:
  --url <URL>           Page to audit (default: baseUrl from perf.config.mjs,
                        else http://localhost:3000)
  --desktop             Desktop emulation (default: mobile, simulated slow 4G)
  --format <type>       Output format: terminal | markdown | json (default: terminal)
  --site                Audit routes from perf.config.mjs plus /sitemap.xml
  --limit <number>      Max number of pages when using --site (default: 5)
  --output-dir <path>   Directory for report files (default: .perf-reports)
  --check               Exit with code 2 if a perf.config.mjs threshold is missed
  --fail-under <score>  Like --check, but sets the minimum performance score

Init options:
  --force               Overwrite skill and rule files that you have edited

  -h, --help            Show this help message
`);
}

/**
 * Main CLI execution logic.
 */
export async function main() {
  const config = parseCliArgs();

  if (config.command === 'help') {
    printHelp();
    return;
  }

  if (config.command === 'init') {
    await scaffoldProject(process.cwd(), { installDependency: true, force: config.force });
    return;
  }

  // Read local perf.config.mjs if present
  let localConfig = {};
  const configPath = path.join(process.cwd(), 'perf.config.mjs');
  if (fs.existsSync(configPath)) {
    try {
      const mod = await import(pathToFileURL(configPath).href);
      localConfig = mod.default || {};
    } catch (err) {
      console.error(`Warning: could not load perf.config.mjs (${err.message}). Using defaults.`);
    }
  }

  const targetUrl = config.url || localConfig.baseUrl || 'http://localhost:3000';
  const format = config.format || 'terminal';
  const isDesktop = config.desktop;

  // 1. Pre-flight Connectivity Check
  const reachable = await checkServerReachable(targetUrl, 3000);
  if (!reachable) {
    const errorMsg =
      `❌ Target server is not reachable at ${targetUrl}.\n` +
      `   Please ensure your application server is running locally (e.g. npm run dev or npm run start) before auditing.`;
    if (format === 'json') {
      console.log(JSON.stringify({ error: errorMsg, url: targetUrl }));
    } else {
      console.error(errorMsg);
    }
    process.exit(1);
  }

  // 2. Discover URLs to Audit
  let urlsToAudit = [targetUrl];
  if (config.site) {
    if (format === 'terminal') console.log(`🔍 Discovering routes from ${targetUrl}/sitemap.xml...`);
    const limit = config.limit || 5;
    const discovered = localConfig.discoverSitemap === false ? [] : await fetchSitemapRoutes(targetUrl);
    urlsToAudit = mergeRoutes(targetUrl, localConfig.routes, discovered, limit);
    if (urlsToAudit.length === 0) urlsToAudit = [targetUrl];
  }

  // 3. Launch Headless Chrome
  if (format === 'terminal') console.log(`🚀 Launching headless Chrome...`);
  const { chrome, port } = await launchChrome();

  const results = [];
  try {
    for (const url of urlsToAudit) {
      if (format === 'terminal') console.log(`⏱️ Auditing ${url} (${isDesktop ? 'desktop' : 'mobile'})...`);
      const auditData = await runLighthouse(url, { port, desktop: isDesktop });
      results.push(auditData);
    }
  } finally {
    await chrome.kill();
  }

  // 4. Save reports to output directory
  const outDir = path.resolve(process.cwd(), config.outputDir);
  fs.mkdirSync(outDir, { recursive: true });

  const scorecardJsonPath = path.join(outDir, 'scorecard.json');
  const summaryMdPath = path.join(outDir, 'summary.md');

  const primaryResult = results[0];
  fs.writeFileSync(scorecardJsonPath, JSON.stringify(results.length === 1 ? formatJson(primaryResult) : results.map(formatJson), null, 2));

  const mdSummary = results.map(formatMarkdown).join('\n\n---\n\n');
  fs.writeFileSync(summaryMdPath, mdSummary);

  // 5. Output to stdout
  if (format === 'json') {
    console.log(JSON.stringify(results.length === 1 ? formatJson(primaryResult) : results.map(formatJson), null, 2));
  } else if (format === 'markdown') {
    console.log(mdSummary);
  } else {
    for (const res of results) {
      console.log(formatTerminal(res));
    }
    console.log(`📁 Detailed reports saved to: ${path.relative(process.cwd(), outDir)}/\n`);
  }

  // 6. Optional threshold gate for CI
  if (config.check) {
    const thresholds = { ...DEFAULT_THRESHOLDS, ...(localConfig.thresholds || {}) };
    if (config.failUnder !== null) thresholds.performance = config.failUnder;

    const failures = evaluateThresholds(results.map(formatJson), thresholds);
    if (failures.length > 0) {
      console.error('\nThreshold check failed:');
      for (const f of failures) {
        const rel = f.metric === 'performance' ? 'below' : 'above';
        console.error(`  ${f.url}: ${f.metric} ${f.actual} is ${rel} the limit of ${f.limit}`);
      }
      process.exitCode = 2;
    } else if (format === 'terminal') {
      console.log('Threshold check passed.');
    }
  }
}

// Auto-run if executed from terminal
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error('Audit failed:', err.message);
    process.exit(1);
  });
}
