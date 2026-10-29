import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/cli.mjs', import.meta.url));

const run = (args, options = {}) =>
  spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf-8', ...options });

describe('bin/cli.mjs launcher', () => {
  it('prints usage for --help', () => {
    const res = run(['--help']);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Usage:/);
  });

  it('prints usage when launched through a symlink', { skip: process.platform === 'win32' }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-link-'));
    const link = path.join(dir, 'perf-pilot');
    fs.symlinkSync(BIN, link);

    const res = spawnSync(process.execPath, [link, '--help'], { encoding: 'utf-8' });
    fs.rmSync(dir, { recursive: true, force: true });

    assert.equal(res.status, 0);
    assert.match(res.stdout, /Usage:/);
  });

  it('exits 1 with a message when the server is unreachable', () => {
    const res = run(['audit', '--url', 'http://127.0.0.1:59999']);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /not reachable/);
  });

  it('init outside a project exits 1 and names package.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-noproj-'));
    const res = run(['init'], { cwd: dir });
    fs.rmSync(dir, { recursive: true, force: true });

    assert.equal(res.status, 1);
    assert.match(res.stderr, /package\.json/);
    assert.doesNotMatch(res.stderr, /Audit failed/);
  });
});
