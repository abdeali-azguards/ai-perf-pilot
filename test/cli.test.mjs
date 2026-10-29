import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../src/cli.mjs';

describe('CLI argument parsing', () => {
  it('parses audit command with --url, --desktop, and --format flags', () => {
    const args = ['audit', '--url', 'http://localhost:3000/contact', '--desktop', '--format', 'markdown'];
    const parsed = parseCliArgs(args);
    assert.equal(parsed.command, 'audit');
    assert.equal(parsed.url, 'http://localhost:3000/contact');
    assert.equal(parsed.desktop, true);
    assert.equal(parsed.format, 'markdown');
  });

  it('defaults to mobile and terminal format, leaving url unset so config can supply it', () => {
    const parsed = parseCliArgs(['audit']);
    assert.equal(parsed.command, 'audit');
    assert.equal(parsed.desktop, false);
    assert.equal(parsed.format, 'terminal');
    assert.equal(parsed.url, undefined);
    assert.equal(parsed.check, false);
  });

  it('--fail-under implies --check and carries the score', () => {
    const parsed = parseCliArgs(['audit', '--fail-under', '90']);
    assert.equal(parsed.check, true);
    assert.equal(parsed.failUnder, 90);
  });

  it('runs once by default, three times under --check, or as many as --runs says', () => {
    assert.equal(parseCliArgs(['audit']).runs, 1);
    assert.equal(parseCliArgs(['audit', '--check']).runs, 3);
    assert.equal(parseCliArgs(['audit', '--fail-under', '90']).runs, 3);
    assert.equal(parseCliArgs(['audit', '--runs', '5']).runs, 5);
    assert.equal(parseCliArgs(['audit', '--check', '--runs', '1']).runs, 1);
  });

  it('ignores an invalid --runs value and falls back to the default', () => {
    assert.equal(parseCliArgs(['audit', '--runs', 'abc']).runs, 1);
    assert.equal(parseCliArgs(['audit', '--runs', '0']).runs, 1);
    assert.equal(parseCliArgs(['audit', '--runs', '-2', '--check']).runs, 3);
  });

  it('parses init --force', () => {
    assert.equal(parseCliArgs(['init', '--force']).force, true);
    assert.equal(parseCliArgs(['init']).force, false);
  });

  it('recognizes init command', () => {
    const parsed = parseCliArgs(['init']);
    assert.equal(parsed.command, 'init');
  });

  it('parses --site and --limit flags', () => {
    const parsed = parseCliArgs(['audit', '--site', '--limit', '3']);
    assert.equal(parsed.command, 'audit');
    assert.equal(parsed.site, true);
    assert.equal(parsed.limit, 3);
  });
});
