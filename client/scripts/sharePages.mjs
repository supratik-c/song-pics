import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  getPuzzleDirectory,
  isFuturePuzzleDateId,
} from './puzzleConventions.mjs';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';

const SHARE_DIRECTORY_NAME = 'share';
const SHARE_PAGE_FILE_NAME = 'index.html';
const PAGE_TITLE = 'Scribble Bops — Guess the Song';

export function writeReleasedPuzzleSharePages(
  projectRoot,
  outputDirectory,
  {
    publicSiteUrl,
    today = new Date(),
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
    const sharePage = createPuzzleSharePage(applicationHtml, {
      firstPanelUrl: new URL(
        firstPanel.src.replace(/^\/+/, ''),
        siteUrl,
      ).toString(),
      issueNumber: index + 1,
      shareUrl: new URL(
        `${SHARE_DIRECTORY_NAME}/${puzzle.id}/`,
        siteUrl,
      ).toString(),
    });

    mkdirSync(sharePageDirectory, { recursive: true });
    writeFileSync(
      resolve(sharePageDirectory, SHARE_PAGE_FILE_NAME),
      sharePage,
    );
  });
}

export function createPuzzleSharePage(
  applicationHtml,
  { firstPanelUrl, issueNumber, shareUrl },
) {
  const description =
    `Issue #${issueNumber}: What song are these suspicious scribbles trying to be?`;
  const firstPanel = new URL(firstPanelUrl);
  const imageMimeType = getImageMimeType(firstPanel.pathname);
  const metadata = [
    `<link rel="canonical" href="${escapeHtml(shareUrl)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Scribble Bops" />',
    `<meta property="og:title" content="${escapeHtml(PAGE_TITLE)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(firstPanelUrl)}" />`,
    ...(firstPanel.protocol === 'https:'
      ? [`<meta property="og:image:secure_url" content="${escapeHtml(firstPanelUrl)}" />`]
      : []),
    `<meta property="og:image:type" content="${imageMimeType}" />`,
    `<meta property="og:image:alt" content="First Scribble Bops clue panel for Issue #${issueNumber}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(PAGE_TITLE)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(firstPanelUrl)}" />`,
    `<meta name="twitter:image:alt" content="First Scribble Bops clue panel for Issue #${issueNumber}" />`,
  ].map((line) => `    ${line}`).join('\n');

  if (!applicationHtml.includes('</head>')) {
    throw new Error('Built application HTML is missing </head>');
  }

  return applicationHtml.replace(
    /\s*<\/head>/,
    `\n${metadata}\n  </head>`,
  );
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
