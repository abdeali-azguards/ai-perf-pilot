---
name: performance-audit
description: Use when asked to test, audit, or review web performance, measure Core Web Vitals (LCP, TBT, CLS, FCP), check page speed bottlenecks, or optimize and fix frontend performance issues.
---

# Web Performance & Core Web Vitals Audit Skill

## Overview
This skill provides an automated, safe procedure for testing live web page speed, diagnosing root causes for failing Core Web Vitals (LCP, TBT, CLS, FCP), proposing targeted code fixes, and verifying improvements.

**Core Rule:** Always follow the 5-stage protocol. Never modify code files without presenting the diagnosis and receiving user confirmation first (Stage 4 gate).

---

## The 5-Stage Protocol

### Stage 1: Pre-Flight Server Check
1. Verify if the target application is running locally (default: `http://localhost:3000`).
2. If not running, inform the user or start the server:
   - For dev mode: `npm run dev`
   - For true production scores (recommended): `npm run build && npm run start`

### Stage 2: Run the Audit
Execute the performance audit command using markdown format for clean token digestion:
```bash
npx perf-pilot audit --runs 3 --format markdown
# Or for a specific route:
npx perf-pilot audit --url http://localhost:3000/contact --runs 3 --format markdown
```
Read the generated scorecard and top actionable bottlenecks.

### Stage 3: Root-Cause Diagnosis & Fix Plan
Correlate flagged bottlenecks with source code:

| Metric | Target | Common Root Causes | Key Remedies |
| :--- | :--- | :--- | :--- |
| **LCP** | <= 2.5s | Hero image loaded late or client-rendered | Add `priority` & `sizes` to `<Image />`, preconnect critical origins |
| **TBT** | <= 200ms | Heavy JavaScript bundles executing on main thread | Wrap heavy components in `next/dynamic` (`ssr: false`), defer modals |
| **CLS** | <= 0.1 | Images, iframes, or ads without fixed dimensions | Add explicit `width`/`height` or CSS `aspect-ratio`, reserved skeletons |
| **FCP** | <= 1.8s | Render-blocking CSS or fonts | Optimize font display (`next/font`), prune unused global CSS |

Formulate a concise, bulleted fix plan listing:
1. Target files and line numbers.
2. The specific code changes to be made.
3. The expected metric improvement (e.g. "Estimated ~350ms TBT reduction").

### Stage 4: Mandatory Confirmation Gate (DO NOT SKIP)
Present the diagnostic findings and the proposed plan to the user:
> "I completed the performance audit. Here are the bottlenecks found and my proposed changes. Would you like me to proceed with applying these fixes?"

**HARD PAUSE:** Wait for the user's explicit confirmation before making any code modifications.

### Stage 5: Execution & Verification
1. Apply the approved code modifications.
2. Re-run the audit with several runs, because a single Lighthouse run can vary by several points and a small "improvement" may just be noise:
   ```bash
   npx perf-pilot audit --runs 3 --format markdown
   ```
   Use the same `--url` and mode as the baseline, and take the baseline with `--runs 3` as well so the two are comparable.
3. Compare the baseline scorecard with the new scorecard and present a before/after summary table to the user. Only call something an improvement if the change is larger than the spread between the run scores shown in the output.
