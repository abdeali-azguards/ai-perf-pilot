#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { detectFramework } from '../src/detectors/framework.mjs';
import { detectPackageManager } from '../src/detectors/package-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

/**
 * Scaffolds @azguards/ai-perf-pilot configuration and AI agent skills into the target project.
 *
 * @param {string} projectRoot - Target project directory
 * @param {object} [options={}]
 * @param {boolean} [options.installDependency=true]
 * @param {boolean} [options.silent=false]
 * @returns {Promise<{ filesCreated: string[], framework: string, packageManager: string }>}
 */
export async function scaffoldProject(projectRoot, options = {}) {
  const silent = Boolean(options.silent);
  const log = (...args) => {
    if (!silent) console.log(...args);
  };

  log('\n⚡ Initializing @azguards/ai-perf-pilot in project...');

  // 1. Detect Framework & Package Manager
  const framework = detectFramework(projectRoot);
  const packageManager = detectPackageManager(projectRoot);
  log(`  ↳ Framework detected: ${framework.name}`);
  log(`  ↳ Package manager:   ${packageManager}`);

  const filesCreated = [];

  // 2. Ensure directories exist
  const skillDir = path.join(projectRoot, '.agents', 'skills', 'performance-audit');
  const refDir = path.join(skillDir, 'references');
  const cursorDir = path.join(projectRoot, '.cursor', 'rules');

  fs.mkdirSync(refDir, { recursive: true });
  fs.mkdirSync(cursorDir, { recursive: true });

  // 3. Write Skill & Documentation Templates
  const templatesDir = path.join(PACKAGE_ROOT, 'src', 'templates');

  const skillDest = path.join(skillDir, 'SKILL.md');
  fs.copyFileSync(path.join(templatesDir, 'SKILL.md'), skillDest);
  filesCreated.push(skillDest);

  const refDest = path.join(refDir, 'nextjs-remediation.md');
  fs.copyFileSync(path.join(templatesDir, 'nextjs-fixes.md'), refDest);
  filesCreated.push(refDest);

  const cursorDest = path.join(cursorDir, 'perf-audit.mdc');
  fs.copyFileSync(path.join(templatesDir, 'cursor-rule.mdc'), cursorDest);
  filesCreated.push(cursorDest);

  // 4. Write starter perf.config.mjs if not present
  const configDest = path.join(projectRoot, 'perf.config.mjs');
  if (!fs.existsSync(configDest)) {
    fs.copyFileSync(path.join(templatesDir, 'config.template.mjs'), configDest);
    filesCreated.push(configDest);
  }

  // 5. Update package.json scripts
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['perf:audit'] = 'perf-pilot audit';
  pkg.scripts['perf:audit:desktop'] = 'perf-pilot audit --desktop';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  filesCreated.push(pkgPath);

  // 6. Optional: Install devDependency
  if (options.installDependency) {
    log(`\n📦 Installing @azguards/ai-perf-pilot as a devDependency using ${packageManager}...`);
    try {
      let installCmd = 'npm install -D @azguards/ai-perf-pilot';
      if (packageManager === 'pnpm') installCmd = 'pnpm add -D @azguards/ai-perf-pilot';
      else if (packageManager === 'yarn') installCmd = 'yarn add -D @azguards/ai-perf-pilot';
      else if (packageManager === 'bun') installCmd = 'bun add -D @azguards/ai-perf-pilot';

      execSync(installCmd, { cwd: projectRoot, stdio: silent ? 'ignore' : 'inherit' });
    } catch (err) {
      log(`⚠️ Could not auto-install package: ${err.message}. Please install manually.`);
    }
  }

  log('\n✅ Successfully initialized @azguards/ai-perf-pilot!');
  log('  - AI skill configured: .agents/skills/performance-audit/SKILL.md');
  log('  - Cursor rule created: .cursor/rules/perf-audit.mdc');
  log('  - Config generated:    perf.config.mjs');
  log('  - Scripts added:       npm run perf:audit\n');

  return {
    filesCreated,
    framework: framework.name,
    packageManager,
  };
}

// If invoked directly from terminal:
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  scaffoldProject(process.cwd(), { installDependency: true }).catch((err) => {
    console.error('Initialization failed:', err.message);
    process.exit(1);
  });
}
