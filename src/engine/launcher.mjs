import * as chromeLauncher from 'chrome-launcher';

/**
 * Check if the target server port is open and accepting HTTP requests.
 *
 * @param {string} url - Target URL to probe
 * @param {number} [timeoutMs=2000] - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export async function checkServerReachable(url, timeoutMs = 2000) {
  try {
    const parsed = new URL(url);
    const probeUrl = `${parsed.protocol}//${parsed.host}/`;
    const res = await fetch(probeUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.status < 500 || res.status === 404 || res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Launch a headless Google Chrome / Chromium instance.
 *
 * @param {object} [options={}]
 * @returns {Promise<{ chrome: object, port: number }>}
 */
export async function launchChrome(options = {}) {
  const flags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--disable-extensions',
    ...(options.additionalFlags || []),
  ];

  try {
    const chrome = await chromeLauncher.launch({
      chromeFlags: flags,
      logLevel: options.logLevel || 'silent',
    });

    return {
      chrome,
      port: chrome.port,
    };
  } catch (err) {
    if (err.message && err.message.includes('No Chrome installations found')) {
      throw new Error(
        'Google Chrome or Chromium is required to run performance audits. ' +
        'Please install Chrome or set the CHROME_PATH environment variable to your Chrome/Chromium executable.'
      );
    }
    throw err;
  }
}
