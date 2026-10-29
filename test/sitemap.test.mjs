import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSitemapXml, extractLocalRoutes, mergeRoutes, originOf } from '../src/engine/sitemap.mjs';
import { checkServerReachable } from '../src/engine/launcher.mjs';

describe('Sitemap parser & URL helpers', () => {
  it('parses valid sitemap XML and extracts paths', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/blog</loc></url>
        <url><loc>https://example.com/docs/intro</loc></url>
      </urlset>`;
    const routes = parseSitemapXml(xml);
    assert.deepEqual(routes, ['https://example.com/', 'https://example.com/blog', 'https://example.com/docs/intro']);
  });

  it('remaps external production domains to local base URL', () => {
    const urls = ['https://production.com/blog', 'https://production.com/contact'];
    const local = extractLocalRoutes(urls, 'http://localhost:3000');
    assert.deepEqual(local, ['http://localhost:3000/blog', 'http://localhost:3000/contact']);
  });

  it('returns root route fallback when XML is malformed', () => {
    const fallback = parseSitemapXml('NOT_XML');
    assert.deepEqual(fallback, ['/']);
  });

  it('merges config routes ahead of discovered ones and drops duplicates', () => {
    const merged = mergeRoutes(
      'http://localhost:3000/',
      [{ name: 'Home', path: '/' }, { name: 'Pricing', path: 'pricing' }],
      ['http://localhost:3000/', 'http://localhost:3000/pricing/', 'http://localhost:3000/blog'],
    );
    assert.deepEqual(merged, [
      'http://localhost:3000/',
      'http://localhost:3000/pricing',
      'http://localhost:3000/blog',
    ]);
  });

  it('applies the limit after merging', () => {
    const merged = mergeRoutes('http://localhost:3000', [], ['http://localhost:3000/a', 'http://localhost:3000/b'], 1);
    assert.deepEqual(merged, ['http://localhost:3000/a']);
  });

  it('originOf strips paths, queries and trailing slashes', () => {
    assert.equal(originOf('http://localhost:3000/blog?x=1'), 'http://localhost:3000');
    assert.equal(originOf('http://localhost:3000/'), 'http://localhost:3000');
  });

  it('originOf returns invalid input unchanged without throwing', () => {
    assert.equal(originOf('not a url'), 'not a url');
  });

  it('correctly reports unreachable server on closed port', async () => {
    // Port 59999 should not be running anything locally
    const reachable = await checkServerReachable('http://127.0.0.1:59999', 500);
    assert.equal(reachable, false);
  });
});
