#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkServerReachable, launchChrome } from '../src/engine/launcher.mjs';
import { runLighthouse } from '../src/engine/lighthouse.mjs';
import { fetchSitemapRoutes } from '../src/engine/sitemap.mjs';
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
    return { command: 'init' };
  }

  if (parsed.values.help || command === 'help') {
    return { command: 'help' };
  }

  const limitNum = parsed.values.limit ? parseInt(parsed.values.limit, 10) : (parsed.values.site ? 5 : null);

  return {
    command: 'audit',
    url: parsed.values.url || 'http://localhost:3000',
    desktop: Boolean(parsed.values.desktop),
    format: parsed.values.format || 'terminal',
    site: Boolean(parsed.values.site),
    limit: limitNum,
    outputDir: parsed.values['output-dir'] || '.perf-reports',
  };
}

function printHelp() {
  console.log(`
⚡ @azguards/ai-perf-pilot — Autonomous Web Performance & Core Web Vitals Engine

Usage:
  npx @azguards/ai-perf-pilot init        Scaffold AI skill and project config
  npx perf-pilot audit [options]          Audit live URL or site

Options:
  --url <URL>           Target URL to audit (default: http://localhost:3000)
  --desktop             Run unthrottled desktop audit (default: mobile 4G)
  --format <type>       Output format: terminal | markdown | json (default: terminal)
  --site                Audit multiple core routes discovered via sitemap.xml
  --limit <number>      Max number of routes to audit when using --site
  --output-dir <path>   Directory to save report artifacts (default: .perf-reports)
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
    await scaffoldProject(process.cwd());
    return;
  }

  // Read local perf.config.mjs if present
  let localConfig = {};
  const configPath = path.join(process.cwd(), 'perf.config.mjs');
  if (fs.existsSync(configPath)) {
    try {
      const mod = await import(`file://${configPath}`);
      localConfig = mod.default || {};
    } catch {}
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
    urlsToAudit = await fetchSitemapRoutes(targetUrl, config.limit || 5);
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
}

// Auto-run if executed from terminal
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error('Audit failed:', err.message);
    process.exit(1);
  });
}
