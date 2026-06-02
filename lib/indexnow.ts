/**
 * IndexNow helper — notify Bing/Yandex/Seznam when pages change.
 * https://www.indexnow.org/
 */

const SITE_URL = 'https://www.rentfinder.nz';
const INDEXNOW_KEY = '842d43d77ea7f789e79e927f1e4c2a4e';
const HOST = 'www.rentfinder.nz';

const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

export async function notifyIndexNow(urls: string[]) {
  const fullUrls = urls.map((u) =>
    u.startsWith('http') ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`
  );

  const payload = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    urlList: fullUrls.slice(0, 10000), // max 10k per request
  });

  const results = await Promise.allSettled(
    ENDPOINTS.map((endpoint) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: payload,
      }).then((r) => ({ endpoint, status: r.status }))
    )
  );

  return {
    submitted: fullUrls.length,
    endpoints: results.map((r) =>
      r.status === 'fulfilled' ? r.value : { endpoint: 'unknown', status: 'error' }
    ),
  };
}

/**
 * Batch notify IndexNow for recent listings.
 * Called from cron or after import.
 */
export async function notifyRecentListings(listingIds: number[]) {
  const urls = [
    '/',
    '/blog',
    '/map',
    ...listingIds.map((id) => `/listing/${id}`),
  ];
  return notifyIndexNow(urls);
}
