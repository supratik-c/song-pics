// @ts-check
// YouTube video-id extraction shared between the browser app (src/, which
// builds embed/watch URLs from it) and the Node build scripts (scripts/,
// which use it only to validate a puzzle's youtubeURL at authoring time).
// Protocol checking and the accept/reject decision stay in each caller —
// this module only extracts the id.

const standardYouTubeHosts = new Set(['youtube.com', 'www.youtube.com']);
const noCookieYouTubeHosts = new Set([
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * @param {URL} url
 * @returns {string | null}
 */
export function getYouTubeVideoId(url) {
  if (url.hostname === 'youtu.be') {
    const pathParts = url.pathname.split('/').filter(Boolean);

    return pathParts.length === 1 && isValidVideoId(pathParts[0])
      ? pathParts[0]
      : null;
  }

  if (standardYouTubeHosts.has(url.hostname) && url.pathname === '/watch') {
    const queryVideoId = url.searchParams.get('v');

    return queryVideoId && isValidVideoId(queryVideoId) ? queryVideoId : null;
  }

  if (
    (standardYouTubeHosts.has(url.hostname) ||
      noCookieYouTubeHosts.has(url.hostname)) &&
    url.pathname.startsWith('/embed/')
  ) {
    const pathParts = url.pathname.split('/').filter(Boolean);

    return pathParts.length === 2 &&
      pathParts[0] === 'embed' &&
      isValidVideoId(pathParts[1])
      ? pathParts[1]
      : null;
  }

  return null;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidVideoId(value) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}
