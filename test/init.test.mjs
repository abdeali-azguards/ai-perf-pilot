import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scaffoldProject } from '../bin/init.mjs';

describe('Scaffolder init', () => {
  it('creates .agents/skills/performance-audit/SKILL.md and adds scripts to package.json', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-init-'));
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-next-app', dependencies: { next: '^15.0.0' }, scripts: {} }, null, 2)
    );

    const result = await scaffoldProject(tmpDir, { installDependency: false, silent: true });

    assert.equal(result.framework, 'nextjs');
    const skillPath = path.join(tmpDir, '.agents', 'skills', 'performance-audit', 'SKILL.md');
    const refPath = path.join(tmpDir, '.agents', 'skills', 'performance-audit', 'references', 'nextjs-remediation.md');
    const cursorPath = path.join(tmpDir, '.cursor', 'rules', 'perf-audit.mdc');
    const configPath = path.join(tmpDir, 'perf.config.mjs');

    assert.equal(fs.existsSync(skillPath), true, 'SKILL.md must be created');
    assert.equal(fs.existsSync(refPath), true, 'nextjs-remediation.md must be created');
    assert.equal(fs.existsSync(cursorPath), true, 'Cursor rule must be created');
    assert.equal(fs.existsSync(configPath), true, 'perf.config.mjs must be created');

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
    assert.equal(pkg.scripts['perf:audit'], 'perf-pilot audit');
    assert.equal(pkg.scripts['perf:audit:desktop'], 'perf-pilot audit --desktop');

    // Content checks
    const skillContent = fs.readFileSync(skillPath, 'utf-8');
    assert.match(skillContent, /name: performance-audit/);
    assert.match(skillContent, /Stage 4: Mandatory Confirmation Gate/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('installs the skill for Claude Code and keeps edited files unless forced', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-init-keep-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'app', scripts: {} }));

    await scaffoldProject(tmpDir, { installDependency: false, silent: true });
    const claudeSkill = path.join(tmpDir, '.claude', 'skills', 'performance-audit', 'SKILL.md');
    assert.equal(fs.existsSync(claudeSkill), true, 'Claude Code skill must be created');

    fs.writeFileSync(claudeSkill, 'my edits');
    const kept = await scaffoldProject(tmpDir, { installDependency: false, silent: true });
    assert.equal(fs.readFileSync(claudeSkill, 'utf-8'), 'my edits');
    assert.deepEqual(kept.filesKept, [claudeSkill]);

    await scaffoldProject(tmpDir, { installDependency: false, silent: true, force: true });
    assert.match(fs.readFileSync(claudeSkill, 'utf-8'), /name: performance-audit/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('handles generic non-next projects', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-init-gen-'));
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'generic-app', scripts: {} }, null, 2)
    );

    const result = await scaffoldProject(tmpDir, { installDependency: false, silent: true });
    assert.equal(result.framework, 'generic');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
