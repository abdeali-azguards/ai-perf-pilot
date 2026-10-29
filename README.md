# @azguards/ai-perf-pilot

A small CLI that runs Lighthouse against a page, boils the result down to Core Web Vitals plus a ranked list of bottlenecks, and ships an agent skill so your AI coding assistant can read that report, propose fixes, and verify them. The assistant is instructed to ask for your approval before it edits anything.

[![npm version](https://img.shields.io/npm/v/@azguards/ai-perf-pilot.svg)](https://www.npmjs.com/package/@azguards/ai-perf-pilot)
[![node](https://img.shields.io/node/v/@azguards/ai-perf-pilot.svg)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/@azguards/ai-perf-pilot.svg)](https://opensource.org/licenses/MIT)

## Contents

- [Quick start](#quick-start)
- [What you get](#what-you-get)
- [Using it with an AI assistant](#using-it-with-an-ai-assistant)
- [CLI reference](#cli-reference)
- [Auditing several pages](#auditing-several-pages)
- [Configuration](#configuration)
- [Reading the results](#reading-the-results)
- [Using it in CI](#using-it-in-ci)
- [Programmatic use](#programmatic-use)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)

## Quick start

You need Node.js 18+ and Google Chrome (or Chromium) installed.

```bash
npx @azguards/ai-perf-pilot init
```

That one command sets up the project and installs the package as a dev dependency (details below). Start your app, then run an audit:

```bash
npm run dev          # or: npm run build && npm run start
npm run perf:audit
```

Audit a production build when you can. Dev servers ship unminified code and skew every number.

### What `init` changes

Run it from your project root (it needs a `package.json`). It:

- detects your package manager (npm, pnpm, yarn, bun) and framework (Next.js, Vite, Astro, Nuxt, or generic) and prints what it found
- installs `@azguards/ai-perf-pilot` as a dev dependency, unless it's already in your `package.json`
- adds two scripts to `package.json`: `perf:audit` and `perf:audit:desktop`
- writes the skill, the instructions your AI assistant follows, to `.agents/skills/performance-audit/SKILL.md` (Antigravity) and `.claude/skills/performance-audit/SKILL.md` (Claude Code)
- writes `references/nextjs-remediation.md` next to each skill, a short fix guide for LCP, TBT and CLS in Next.js
- writes `.cursor/rules/perf-audit.mdc`, the same protocol as a Cursor rule
- creates `perf.config.mjs` if you don't already have one

If you've edited any of the skill or rule files, a re-run leaves them alone and tells you which ones it skipped. Pass `--force` to overwrite them.

## What you get

Every run produces:

- **Category scores** (0-100) for Performance, Accessibility, Best Practices and SEO
- **Five metrics** (LCP, TBT, CLS, FCP, Speed Index), each rated good / needs improvement / poor against Google's thresholds
- **Up to ten bottlenecks**, sorted by estimated time saved, with the offending files or elements listed

The bottleneck list is drawn from these Lighthouse audits: render-blocking resources, unused JavaScript, unused CSS, modern image formats, offscreen images, unminified JS and CSS, server response time, cache lifetimes, and the LCP element.

Results are printed in the format you choose and always written to `.perf-reports/`:

| File | Contents |
| :--- | :--- |
| `scorecard.json` | Full structured result. An array when you audit more than one URL. |
| `summary.md` | Compact Markdown tables, small enough to paste into a PR or a prompt. |

Add `.perf-reports/` to your `.gitignore`.

## Using it with an AI assistant

After `init`, ask in plain language:

> Audit the homepage and tell me what's hurting LCP.

> Run a mobile audit on `/pricing`, work out why TBT is high, and propose a fix.

> Audit the main routes from the sitemap and compare them.

The installed skill makes the assistant work in five stages:

1. **Check the server.** Confirm the app is running, or start it.
2. **Audit.** Run `npx perf-pilot audit --format markdown` and read the scorecard.
3. **Diagnose.** Match each bottleneck to code and draft a fix plan: files, changes, and expected gain.
4. **Ask you.** Present the plan and stop. No edits happen without your go-ahead.
5. **Apply and verify.** Make the approved changes, re-run the audit, and show before and after numbers.

Cursor reads `.cursor/rules/`, Antigravity reads `.agents/skills/`, and Claude Code reads `.claude/skills/`. `init` writes all three.

The approval step is an instruction to the assistant, not something the CLI enforces. The CLI itself never edits your code.

## CLI reference

```
perf-pilot init [--force]       Set up the skill, rule, config and scripts
perf-pilot audit [options]      Run an audit (this is the default command)
```

| Option | Default | Description |
| :--- | :--- | :--- |
| `--url <url>` | `baseUrl` from config, else `http://localhost:3000` | Page to audit |
| `--desktop` | off | Desktop emulation with light throttling. Without it, runs mobile with Lighthouse's simulated slow 4G and 4x CPU slowdown. |
| `--format <type>` | `terminal` | `terminal`, `markdown`, or `json`. With `json` or `markdown`, stdout carries only the report, so you can pipe it. |
| `--site` | off | Audit several pages: your configured routes plus the sitemap (see below) |
| `--limit <n>` | `5` | With `--site`, the maximum number of pages |
| `--output-dir <path>` | `.perf-reports` | Where to write `scorecard.json` and `summary.md` |
| `--check` | off | Exit with code `2` if a threshold from `perf.config.mjs` is missed (see [CI](#using-it-in-ci)) |
| `--fail-under <score>` | | Same as `--check`, with the minimum performance score set on the command line |
| `-h`, `--help` | | Show help |

Examples:

```bash
npx perf-pilot audit --url http://localhost:3000/contact
npx perf-pilot audit --desktop --format markdown
npx perf-pilot audit --format json > result.json
```

## Auditing several pages

`--site` builds a list of pages from the `routes` in your config, followed by the entries in `/sitemap.xml`, and audits the first `--limit` of them:

```bash
npx perf-pilot audit --site --limit 10
```

Things worth knowing:

- Config routes come first, so list your most important pages there. Duplicates are dropped.
- Sitemap URLs are rewritten onto the base URL, so a production sitemap served by your local server still audits `localhost`.
- Pages are audited one at a time, in order.
- Sitemap index files (`<sitemapindex>`) aren't followed.
- Set `discoverSitemap: false` in the config to audit only your listed routes.
- If the sitemap is missing or can't be fetched, the audit uses your config routes, or just the base URL if there are none.

## Configuration

`init` creates `perf.config.mjs` in your project root:

```js
export default {
  // Used when --url isn't given
  baseUrl: 'http://localhost:3000',

  // Pages audited first when you pass --site
  routes: [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ],

  // Also pull pages from /sitemap.xml when you pass --site
  discoverSitemap: true,

  // Used by --check
  thresholds: {
    performance: 85, // minimum overall score, 0-100
    lcp: 2500,       // maximum, ms
    tbt: 200,        // maximum, ms
    cls: 0.1,        // maximum
  },
};
```

Command-line flags win over the config. If the file fails to load, you get a warning and the defaults are used.

## Reading the results

Ratings follow Google's published thresholds:

| Metric | Good | Needs improvement | Poor |
| :--- | :--- | :--- | :--- |
| LCP, Largest Contentful Paint | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| TBT, Total Blocking Time | ≤ 200 ms | ≤ 600 ms | > 600 ms |
| CLS, Cumulative Layout Shift | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP, First Contentful Paint | ≤ 1.8 s | ≤ 3.0 s | > 3.0 s |
| Speed Index | ≤ 3.4 s | ≤ 5.8 s | > 5.8 s |

TBT stands in for INP here. Lighthouse can't measure INP in a lab run because it needs real user interaction, and TBT is the closest lab proxy.

## Using it in CI

Add `--check` to fail the build when a page misses the `thresholds` in your config, or `--fail-under` to set the minimum performance score right on the command line:

```bash
npx perf-pilot audit --check
npx perf-pilot audit --site --fail-under 90
```

| Exit code | Meaning |
| :--- | :--- |
| `0` | Audit finished, and any threshold check passed. Without `--check` the scores are never judged. |
| `1` | The server was unreachable or the audit crashed. |
| `2` | The audit finished but at least one page missed a threshold. Each miss is listed on stderr. |

Without a `thresholds` block, `--check` uses performance 85, LCP 2500 ms, TBT 200 ms and CLS 0.1. Only the values you set in the config are overridden.

`scorecard.json` holds scores on a 0-100 scale. A single-page run writes an object; with `--site` it's an array with one entry per page. The CI runner needs Chrome installed.

## Programmatic use

The audit pieces are exported as ES modules:

```js
import { launchChrome, runLighthouse, formatMarkdown } from '@azguards/ai-perf-pilot';

const { chrome, port } = await launchChrome();
try {
  const result = await runLighthouse('http://localhost:3000', { port, desktop: false });
  console.log(formatMarkdown(result));
} finally {
  await chrome.kill();
}
```

Also exported: `checkServerReachable`, `fetchSitemapRoutes`, `parseSitemapXml`, `normalizeAuditResults`, `getMetricRating`, `formatJson`, `formatTerminal`, `detectFramework`, `detectPackageManager`, `scaffoldProject`.

## Limitations

- **Lab data, not field data.** These are simulated runs on your machine. They're good for finding problems and checking a fix, not for predicting what real users see.
- **One run per page.** Lighthouse scores vary between runs. Re-run a couple of times before trusting a small difference, and close heavy apps while auditing.
- **No history.** Each run overwrites the previous report in the output directory. Copy `scorecard.json` aside if you want a baseline.
- **Fix guidance is Next.js-centred.** The audit works on any site, but the bundled remediation guide covers Next.js and React only.
- **The 30 second navigation timeout** isn't configurable from the CLI.

## Troubleshooting

**Target server is not reachable at http://localhost:3000**

Nothing answered on that URL. Start your app, or pass the right address with `--url`.

**Google Chrome or Chromium is required**

Install Chrome, or point `CHROME_PATH` at an existing binary:

```bash
# Windows (PowerShell)
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

# macOS / Linux
export CHROME_PATH="/usr/bin/google-chrome"
```

**No package.json found**

Run `init` from your project root.

**Audit timed out**

The page didn't finish loading in 30 seconds. Look for requests that never complete, such as a hanging API call or an endless polling loop.

## License

MIT, Team Azguards | Azguards Technolabs
