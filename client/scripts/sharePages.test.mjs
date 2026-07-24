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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createPuzzleSharePage,
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
    });

    const earlierPage = readSharePage('2026-07-22');
    const laterPage = readSharePage('2026-07-23');

    expect(earlierPage).toContain(
      'content/puzzles/2026-07-22/2.png',
    );
    expect(earlierPage).toContain('Issue #1:');
    expect(laterPage).toContain(
      'https://example.test/song-pics/share/2026-07-23/',
    );
    expect(laterPage).toContain(
      '<link rel="canonical" href="https://example.test/song-pics/share/2026-07-23/" />',
    );
    expect(laterPage).toContain(
      '<meta property="og:image:type" content="image/webp" />',
    );
    expect(laterPage).toContain('property="og:image:secure_url"');
    expect(laterPage).toContain('name="twitter:image:alt"');
    expect(laterPage).toContain('Issue #2:');
    expect(() => readSharePage('2026-07-24')).toThrow();
  });

  it('adds only HTML beneath the share directory', () => {
    writePuzzle('2026-07-23', ['1.webp']);

    writeReleasedPuzzleSharePages(temporaryRoot, outputDirectory, {
      publicSiteUrl: 'https://example.test/',
      today: new Date(2026, 6, 23, 12),
    });

    expect(
      readdirSync(resolve(outputDirectory, 'share', '2026-07-23')),
    ).toEqual(['index.html']);
  });
});

describe('share page HTML', () => {
  it('escapes metadata values before inserting them into the app shell', () => {
    const page = createPuzzleSharePage(
      '<html><head></head><body></body></html>',
      {
        firstPanelUrl: 'https://example.test/a.webp?x=1&y=2',
        issueNumber: 3,
        shareUrl: 'https://example.test/share/3/?x=1&y=2',
      },
    );

    expect(page).toContain('a.webp?x=1&amp;y=2');
    expect(page).toContain('share/3/?x=1&amp;y=2');
  });

  it('does not describe an HTTP image as a secure URL', () => {
    const page = createPuzzleSharePage(
      '<html><head></head><body></body></html>',
      {
        firstPanelUrl: 'http://example.test/a.png',
        issueNumber: 3,
        shareUrl: 'http://example.test/share/3/',
      },
    );

    expect(page).toContain('content="image/png"');
    expect(page).not.toContain('og:image:secure_url');
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
