import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../bin/cli.mjs';

describe('CLI argument parsing', () => {
  it('parses audit command with --url, --desktop, and --format flags', () => {
    const args = ['audit', '--url', 'http://localhost:3000/contact', '--desktop', '--format', 'markdown'];
    const parsed = parseCliArgs(args);
    assert.equal(parsed.command, 'audit');
    assert.equal(parsed.url, 'http://localhost:3000/contact');
    assert.equal(parsed.desktop, true);
    assert.equal(parsed.format, 'markdown');
  });

  it('defaults to mobile, terminal format, and root url when omitted', () => {
    const parsed = parseCliArgs(['audit']);
    assert.equal(parsed.command, 'audit');
    assert.equal(parsed.desktop, false);
    assert.equal(parsed.format, 'terminal');
    assert.equal(parsed.url, 'http://localhost:3000');
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
