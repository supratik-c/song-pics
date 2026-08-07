import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { extname, resolve } from 'node:path';
import { PRODUCT_NAME, SHARE_INVITATION } from '../shared/branding.mjs';
import {
  getPuzzleDirectory,
  isFuturePuzzleDateId,
} from './puzzleConventions.mjs';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';

const SHARE_DIRECTORY_NAME = 'share';
const SHARE_PAGE_FILE_NAME = 'index.html';
const SHARE_PREVIEW_FILE_NAME = 'preview.png';

export function writeReleasedPuzzleSharePages(
  projectRoot,
  outputDirectory,
  {
    publicSiteUrl,
    today = new Date(),
    createSharePreviewImage = defaultCreateSharePreviewImage,
  },
) {
  const applicationHtmlPath = resolve(outputDirectory, 'index.html');
  const puzzleDirectory = getPuzzleDirectory(projectRoot);

  if (!existsSync(applicationHtmlPath) || !existsSync(puzzleDirectory)) {
    return;
  }

  const applicationHtml = readFileSync(applicationHtmlPath, 'utf8');
  const { puzzleIndex, puzzlePanels } = getPuzzleMetadata(
    puzzleDirectory,
    (puzzleId) => !isFuturePuzzleDateId(puzzleId, today),
  );
  const siteUrl = normalizePublicSiteUrl(publicSiteUrl);

  puzzleIndex.forEach((puzzle, index) => {
    const firstPanel = puzzlePanels[puzzle.id]?.[0];

    if (!firstPanel) {
      throw new Error(`Puzzle has no share panel: ${puzzle.id}`);
    }

    const sharePageDirectory = resolve(
      outputDirectory,
      SHARE_DIRECTORY_NAME,
      puzzle.id,
    );
    const sourcePanelPath = resolve(
      puzzleDirectory,
      puzzle.id,
      firstPanel.src.split('/').pop(),
    );

    mkdirSync(sharePageDirectory, { recursive: true });

    const { width, height } = createSharePreviewImage(
      sourcePanelPath,
      resolve(sharePageDirectory, SHARE_PREVIEW_FILE_NAME),
    );
    const sharePage = createPuzzleSharePage(applicationHtml, {
      imageUrl: new URL(
        `${SHARE_DIRECTORY_NAME}/${puzzle.id}/${SHARE_PREVIEW_FILE_NAME}`,
        siteUrl,
      ).toString(),
      imageWidth: width,
      imageHeight: height,
      issueNumber: index + 1,
      shareUrl: new URL(
        `${SHARE_DIRECTORY_NAME}/${puzzle.id}/`,
        siteUrl,
      ).toString(),
    });

    writeFileSync(
      resolve(sharePageDirectory, SHARE_PAGE_FILE_NAME),
      sharePage,
    );
  });
}

export function createPuzzleSharePage(
  applicationHtml,
  { imageUrl, imageWidth, imageHeight, issueNumber, shareUrl },
) {
  const image = new URL(imageUrl);
  const imageMimeType = getImageMimeType(image.pathname);
  const hasImageDimensions = Number.isInteger(imageWidth) &&
    imageWidth > 0 &&
    Number.isInteger(imageHeight) &&
    imageHeight > 0;
  const imageAltText = escapeHtml(
    `First ${PRODUCT_NAME} clue panel for Issue #${issueNumber}`,
  );
  const metadata = [
    `<link rel="canonical" href="${escapeHtml(shareUrl)}" />`,
    '<meta property="og:type" content="website" />',
    // No og:site_name: it would duplicate the product name that og:title
    // already carries as the card's title line.
    `<meta property="og:title" content="${escapeHtml(PRODUCT_NAME)}" />`,
    `<meta property="og:description" content="${escapeHtml(SHARE_INVITATION)}" />`,
    `<meta property="og:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    ...(image.protocol === 'https:'
      ? [`<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />`]
      : []),
    `<meta property="og:image:type" content="${imageMimeType}" />`,
    ...(hasImageDimensions
      ? [
        `<meta property="og:image:width" content="${imageWidth}" />`,
        `<meta property="og:image:height" content="${imageHeight}" />`,
      ]
      : []),
    `<meta property="og:image:alt" content="${imageAltText}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(PRODUCT_NAME)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(SHARE_INVITATION)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta name="twitter:image:alt" content="${imageAltText}" />`,
  ].map((line) => `    ${line}`).join('\n');

  if (!applicationHtml.includes('</head>')) {
    throw new Error('Built application HTML is missing </head>');
  }

  return applicationHtml.replace(
    /\s*<\/head>/,
    `\n${metadata}\n  </head>`,
  );
}

// Produces a crawler-compatible preview image at targetPngPath from the
// puzzle's first panel and returns its true dimensions. Meta's crawler
// (Facebook, WhatsApp) does not reliably render `image/webp` og:image
// values, so WebP panels — the only format the authoring pipeline produces,
// see scripts/convert.sh — are decoded to PNG. A PNG panel is copied
// through unchanged. Any other extension is outside the sanctioned
// authoring pipeline and fails the build rather than shipping a preview
// no crawler can render.
export function defaultCreateSharePreviewImage(sourcePanelPath, targetPngPath) {
  const extension = extname(sourcePanelPath).toLowerCase();

  if (extension === '.webp') {
    try {
      execFileSync('dwebp', ['-quiet', sourcePanelPath, '-o', targetPngPath]);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(
          'dwebp is required to build share preview images but was not ' +
          'found on PATH. Install the webp tools package (e.g. ' +
          '"sudo apt-get install --yes webp" or "brew install webp").',
        );
      }

      throw new Error(
        `Failed to decode share preview image from ${sourcePanelPath}: ${error.message}`,
      );
    }
  } else if (extension === '.png') {
    copyFileSync(sourcePanelPath, targetPngPath);
  } else {
    throw new Error(
      `Unsupported share panel image type: ${sourcePanelPath}. Panels ` +
      'must be WebP or PNG — see scripts/convert.sh.',
    );
  }

  return readPngDimensions(targetPngPath);
}

function readPngDimensions(pngPath) {
  const buffer = readFileSync(pngPath);
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const isValidPng = buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(pngSignature) &&
    buffer.toString('ascii', 12, 16) === 'IHDR';

  if (!isValidPng) {
    throw new Error(`Not a valid PNG file: ${pngPath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

// A build artifact's OG/canonical metadata must describe the origin and
// base path it is actually served from. This checks a necessary but not
// sufficient proxy for that — that publicSiteUrl's path matches basePath —
// since the two are configured independently (VITE_PUBLIC_SITE_URL vs.
// VITE_BASE_PATH) and nothing else keeps them in sync. It cannot detect a
// wrong origin at the same path (e.g. a renamed repo whose Pages base
// happens to be "/"), but it does catch a mismatched path, which is what
// broke share previews when a GitHub Pages build was pointed at
// https://scribblebops.com/ while still deploying to a "/song-pics/" base.
export function assertPublicSiteUrlMatchesBasePath(publicSiteUrl, basePath) {
  const sitePathname = normalizePathSegment(new URL(publicSiteUrl).pathname);
  const normalizedBasePath = normalizePathSegment(basePath);

  if (sitePathname !== normalizedBasePath) {
    throw new Error(
      `VITE_PUBLIC_SITE_URL's path (${sitePathname}) does not match ` +
      `VITE_BASE_PATH (${normalizedBasePath}). VITE_PUBLIC_SITE_URL is ` +
      `${publicSiteUrl}; VITE_BASE_PATH is ${basePath}. A build's ` +
      'OG/canonical metadata must describe the origin and base path it is ' +
      'actually served from, or share previews and canonical links break.',
    );
  }
}

function normalizePathSegment(basePath) {
  const withLeadingSlash = basePath.startsWith('/')
    ? basePath
    : `/${basePath}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function getImageMimeType(pathname) {
  const extension = pathname.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const mimeType = mimeTypes[extension];

  if (!mimeType) {
    throw new Error(`Unsupported share panel image type: ${pathname}`);
  }

  return mimeType;
}

function normalizePublicSiteUrl(value) {
  const url = new URL(value);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('VITE_PUBLIC_SITE_URL must use HTTP or HTTPS');
  }

  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.endsWith('/')
    ? url.pathname
    : `${url.pathname}/`;
  return url;
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character],
  );
}
