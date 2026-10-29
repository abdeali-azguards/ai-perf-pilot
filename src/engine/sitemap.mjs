/**
 * Parse XML sitemap string using lightweight regex to extract <loc> URLs.
 * Returns ['/'] fallback if parsing fails or yields no URLs.
 *
 * @param {string} xmlContent
 * @returns {string[]}
 */
export function parseSitemapXml(xmlContent) {
  if (!xmlContent || typeof xmlContent !== 'string') {
    return ['/'];
  }

  const locRegex = /<loc>(.*?)<\/loc>/g;
  const matches = [];
  let match;

  while ((match = locRegex.exec(xmlContent)) !== null) {
    const url = match[1].trim();
    if (url) {
      matches.push(url);
    }
  }

  return matches.length > 0 ? matches : ['/'];
}

/**
 * Remap external or production URLs from sitemap to local base URL.
 *
 * @param {string[]} urls
 * @param {string} localBase - e.g. "http://localhost:3000"
 * @returns {string[]}
 */
export function extractLocalRoutes(urls, localBase) {
  const cleanBase = localBase.replace(/\/+$/, '');

  return urls.map((u) => {
    try {
      const parsed = new URL(u);
      return `${cleanBase}${parsed.pathname}${parsed.search}`;
    } catch {
      // If relative path
      const cleanPath = u.startsWith('/') ? u : `/${u}`;
      return `${cleanBase}${cleanPath}`;
    }
  });
}

/**
 * Fetch and extract routes from a site's /sitemap.xml.
 * Gracefully falls back to root route '/' on fetch or parse failure.
 *
 * @param {string} baseUrl - e.g. "http://localhost:3000"
 * @param {number} [limit] - Max routes to return
 * @returns {Promise<string[]>}
 */
export function fetchSitemapRoutes(baseUrl, limit) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const sitemapUrl = `${cleanBase}/sitemap.xml`;

  return fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) })
    .then((res) => {
      if (!res.ok) {
        return [`${cleanBase}/`];
      }
      return res.text().then((xml) => {
        const rawUrls = parseSitemapXml(xml);
        const localUrls = extractLocalRoutes(rawUrls, cleanBase);
        return limit && limit > 0 ? localUrls.slice(0, limit) : localUrls;
      });
    })
    .catch(() => {
      return [`${cleanBase}/`];
    });
}
