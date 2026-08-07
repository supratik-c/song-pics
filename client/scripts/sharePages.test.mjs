import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertPublicSiteUrlMatchesBasePath,
  createPuzzleSharePage,
  defaultCreateSharePreviewImage,
  writeReleasedPuzzleSharePages,
} from './sharePages.mjs';

const validPuzzle = {
  songClue: 'A spoiler-free clue',
  songTitle: 'A Song',
  artist: 'An Artist',
  acceptedAnswers: ['A Song'],
};

let temporaryRoot;
let outputDirectory;
let puzzleDirectory;
let stubCreateSharePreviewImage;

beforeEach(() => {
  temporaryRoot = mkdtempSync(resolve(tmpdir(), 'song-pics-share-pages-'));
  outputDirectory = resolve(temporaryRoot, 'dist');
  puzzleDirectory = resolve(temporaryRoot, 'content', 'puzzles');
  mkdirSync(outputDirectory, { recursive: true });
  mkdirSync(puzzleDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, 'index.html'),
    '<!doctype html>\n<html><head><title>Scribble Bops</title></head><body></body></html>\n',
  );
  stubCreateSharePreviewImage = vi.fn((sourcePanelPath, targetPngPath) => {
    writeFileSync(targetPngPath, 'preview');
    return { width: 800, height: 600 };
  });
});

afterEach(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe('released puzzle share pages', () => {
  it('writes one page per released puzzle using its first ordered panel', () => {
    writePuzzle('2026-07-22', ['10.webp', '2.png']);
    writePuzzle('2026-07-23', ['1.webp']);
    writePuzzle('2026-07-24', ['1.webp']);

    writeReleasedPuzzleSharePages(temporaryRoot, outputDirectory, {
      publicSiteUrl: 'https://example.test/song-pics/',
      today: new Date(2026, 6, 23, 12),
      createSharePreviewImage: stubCreateSharePreviewImage,
    });

    const earlierPage = readSharePage('2026-07-22');
    const laterPage = readSharePage('2026-07-23');

    expect(stubCreateSharePreviewImage).toHaveBeenCalledWith(
      resolve(puzzleDirectory, '2026-07-22', '2.png'),
      resolve(outputDirectory, 'share', '2026-07-22', 'preview.png'),
    );
    expect(earlierPage).toContain(
      'share/2026-07-22/preview.png',
    );
    expect(earlierPage).not.toContain('2.png');
    expect(earlierPage).toContain(
      '<meta property="og:title" content="Scribble Bops" />',
    );
    expect(laterPage).toContain(
      'https://example.test/song-pics/share/2026-07-23/',
    );
    expect(laterPage).toContain(
      '<link rel="canonical" href="https://example.test/song-pics/share/2026-07-23/" />',
    );
    expect(laterPage).toContain(
      '<meta property="og:image:type" content="image/png" />',
    );
    expect(laterPage).toContain(
      '<meta property="og:image:width" content="800" />',
    );
    expect(laterPage).toContain(
      '<meta property="og:image:height" content="600" />',
    );
    expect(laterPage).toContain('property="og:image:secure_url"');
    expect(laterPage).toContain('name="twitter:image:alt"');
    expect(laterPage).toContain(
      'Can you guess today&#39;s song from some questionable hand-drawn doodles?',
    );
    expect(laterPage).not.toContain(validPuzzle.songTitle);
    expect(laterPage).not.toContain(validPuzzle.artist);
    expect(laterPage).not.toContain('I got it in');
    expect(laterPage).not.toContain('succumb to the scribbles');
    expect(() => readSharePage('2026-07-24')).toThrow();
    expect(stubCreateSharePreviewImage).toHaveBeenCalledTimes(2);
  });

  it('adds only the share HTML and its preview image beneath the share directory', () => {
    writePuzzle('2026-07-23', ['1.webp']);

    writeReleasedPuzzleSharePages(temporaryRoot, outputDirectory, {
      publicSiteUrl: 'https://example.test/',
      today: new Date(2026, 6, 23, 12),
      createSharePreviewImage: stubCreateSharePreviewImage,
    });

    expect(
      readdirSync(resolve(outputDirectory, 'share', '2026-07-23')).sort(),
    ).toEqual(['index.html', 'preview.png']);
  });

  it('rejects a first panel whose extension the authoring pipeline does not produce', () => {
    writePuzzle('2026-07-23', ['1.avif']);

    expect(() => writeReleasedPuzzleSharePages(temporaryRoot, outputDirectory, {
      publicSiteUrl: 'https://example.test/',
      today: new Date(2026, 6, 23, 12),
    })).toThrow(/Unsupported share panel image type.*1\.avif/);
  });
});

// defaultCreateSharePreviewImage shells out to the `dwebp` system binary for
// WebP panels (see convert.sh, which is the only producer of that format),
// so only its dwebp-independent branches — the PNG passthrough and the
// unsupported-extension rejection — are exercised directly here. The WebP
// decode path and the missing-`dwebp` message are covered by the real
// double build in the verification matrix, not by this suite: CI installs
// `dwebp` only after `npm test` runs (see the workflow "Install WebP
// tools" step), so a unit test that shells out to it here would be
// environment-dependent.
describe('defaultCreateSharePreviewImage', () => {
  let sourceDirectory;

  beforeEach(() => {
    sourceDirectory = mkdtempSync(
      resolve(tmpdir(), 'song-pics-share-preview-'),
    );
  });

  afterEach(() => {
    rmSync(sourceDirectory, { recursive: true, force: true });
  });

  it('copies a PNG panel through unchanged and reports its true dimensions', () => {
    const sourcePngPath = resolve(sourceDirectory, '1.png');
    const targetPngPath = resolve(sourceDirectory, 'preview.png');

    writeFileSync(sourcePngPath, onePixelPng());

    const dimensions = defaultCreateSharePreviewImage(
      sourcePngPath,
      targetPngPath,
    );

    expect(dimensions).toEqual({ width: 1, height: 1 });
    expect(readFileSync(targetPngPath)).toEqual(readFileSync(sourcePngPath));
  });

  it('rejects a source extension outside the authoring pipeline', () => {
    const sourcePath = resolve(sourceDirectory, '1.avif');

    writeFileSync(sourcePath, 'not really avif');

    expect(() => defaultCreateSharePreviewImage(
      sourcePath,
      resolve(sourceDirectory, 'preview.png'),
    )).toThrow(/Unsupported share panel image type.*1\.avif/);
  });
});

describe('assertPublicSiteUrlMatchesBasePath', () => {
  it('passes when the site URL path matches the base path', () => {
    expect(() => assertPublicSiteUrlMatchesBasePath(
      'https://supratik-c.github.io/song-pics/',
      '/song-pics/',
    )).not.toThrow();
    expect(() => assertPublicSiteUrlMatchesBasePath(
      'https://scribblebops.com/',
      '/',
    )).not.toThrow();
    expect(() => assertPublicSiteUrlMatchesBasePath(
      'https://dev.scribblebops.com/',
      '/',
    )).not.toThrow();
  });

  it('normalizes missing leading and trailing slashes before comparing', () => {
    expect(() => assertPublicSiteUrlMatchesBasePath(
      'https://example.test/song-pics',
      'song-pics',
    )).not.toThrow();
  });

  it('throws when the site URL points at a different path than the base — the ebec3a4 regression', () => {
    expect(() => assertPublicSiteUrlMatchesBasePath(
      'https://scribblebops.com/',
      '/song-pics/',
    )).toThrow(/VITE_PUBLIC_SITE_URL.*VITE_BASE_PATH/);
  });
});

describe('share page HTML', () => {
  it('escapes metadata values before inserting them into the app shell', () => {
    const page = createPuzzleSharePage(
      '<html><head></head><body></body></html>',
      {
        imageUrl: 'https://example.test/a.png?x=1&y=2',
        issueNumber: 3,
        shareUrl: 'https://example.test/share/3/?x=1&y=2',
      },
    );

    expect(page).toContain('a.png?x=1&amp;y=2');
    expect(page).toContain('share/3/?x=1&amp;y=2');
  });

  it('does not describe an HTTP image as a secure URL', () => {
    const page = createPuzzleSharePage(
      '<html><head></head><body></body></html>',
      {
        imageUrl: 'http://example.test/a.png',
        issueNumber: 3,
        shareUrl: 'http://example.test/share/3/',
      },
    );

    expect(page).toContain('content="image/png"');
    expect(page).not.toContain('og:image:secure_url');
  });

  it('omits width and height when no dimensions are supplied', () => {
    const page = createPuzzleSharePage(
      '<html><head></head><body></body></html>',
      {
        imageUrl: 'https://example.test/a.png',
        issueNumber: 3,
        shareUrl: 'https://example.test/share/3/',
      },
    );

    expect(page).not.toContain('og:image:width');
    expect(page).not.toContain('og:image:height');
  });

  it('preserves the built base-aware legal link in the copied shell', () => {
    const page = createPuzzleSharePage(
      '<html><head></head><body><a href="/song-pics/legal.html">The Legal Stuff</a></body></html>',
      {
        imageUrl: 'https://example.test/a.png',
        issueNumber: 3,
        shareUrl: 'https://example.test/song-pics/share/3/',
      },
    );

    expect(page).toContain('href="/song-pics/legal.html"');
    expect(page).toContain('>The Legal Stuff</a>');
  });
});

function writePuzzle(id, panelNames) {
  const directory = resolve(puzzleDirectory, id);

  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, 'puzzle.json'), JSON.stringify(validPuzzle));

  for (const panelName of panelNames) {
    writeFileSync(resolve(directory, panelName), 'panel');
  }
}

function readSharePage(id) {
  return readFileSync(
    resolve(outputDirectory, 'share', id, 'index.html'),
    'utf8',
  );
}

// A real, valid 1x1 PNG — defaultCreateSharePreviewImage's PNG branch reads
// its IHDR chunk to report true dimensions, so the fixture must be a real
// PNG rather than a placeholder string.
function onePixelPng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
}
