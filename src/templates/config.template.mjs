/**
 * @azguards/ai-perf-pilot Configuration
 *
 * Customize ports, routes, and performance score thresholds for your project.
 */
const perfConfig = {
  // Default base URL for audits
  baseUrl: 'http://localhost:3000',

  // Core routes to audit when running --site or full suite
  routes: [
    { name: 'Home', path: '/' },
  ],

  // Whether to query sitemap.xml for automatic route discovery
  discoverSitemap: true,

  // Performance thresholds (scores 0-100, vitals in ms or ratio)
  thresholds: {
    performance: 85,
    lcp: 2500, // ms
    tbt: 200,  // ms
    cls: 0.1,  // unitless
  },
};

export default perfConfig;
