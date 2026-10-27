import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectFramework } from '../src/detectors/framework.mjs';
import { detectPackageManager } from '../src/detectors/package-manager.mjs';

describe('Detectors', () => {
  it('detects Next.js framework when next is in dependencies', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-det-next-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { next: '16.0.0' } }));
    const result = detectFramework(tmpDir);
    assert.equal(result.name, 'nextjs');
    assert.equal(result.isNext, true);
    assert.equal(result.isVite, false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Vite framework when vite is in devDependencies', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-det-vite-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ devDependencies: { vite: '^5.0.0' } }));
    const result = detectFramework(tmpDir);
    assert.equal(result.name, 'vite');
    assert.equal(result.isNext, false);
    assert.equal(result.isVite, true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects generic when no recognized framework is present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-det-gen-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4.0.0' } }));
    const result = detectFramework(tmpDir);
    assert.equal(result.name, 'generic');
    assert.equal(result.isNext, false);
    assert.equal(result.isVite, false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects pnpm when pnpm-lock.yaml is present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-pm-pnpm-'));
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const pm = detectPackageManager(tmpDir);
    assert.equal(pm, 'pnpm');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects yarn when yarn.lock is present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-pm-yarn-'));
    fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
    const pm = detectPackageManager(tmpDir);
    assert.equal(pm, 'yarn');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects bun when bun.lockb is present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-pm-bun-'));
    fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
    const pm = detectPackageManager(tmpDir);
    assert.equal(pm, 'bun');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults to npm when no special lockfile is present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-pm-npm-'));
    const pm = detectPackageManager(tmpDir);
    assert.equal(pm, 'npm');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws an actionable error when no package.json exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-err-'));
    assert.throws(() => detectFramework(tmpDir), /No package\.json found/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
