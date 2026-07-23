import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';
import {
  copyReleasedContent,
  shouldCopyReleasedEntry,
  writeReleasedPuzzleMetadata,
} from './releaseContent.mjs';

const validPuzzle = {
  songClue: 'A clue',
  songTitle: 'A Song',
  artist: 'An Artist',
  acceptedAnswers: ['A Song'],
};

let temporaryRoot;
let puzzleDirectory;

beforeEach(() => {
  temporaryRoot = mkdtempSync(resolve(tmpdir(), 'song-pics-metadata-'));
  puzzleDirectory = resolve(temporaryRoot, 'content', 'puzzles');
  mkdirSync(puzzleDirectory, { recursive: true });
});

afterEach(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe('puzzle metadata extraction', () => {
  it('sorts puzzle IDs and numeric panel filenames', () => {
    writePuzzle('2026-07-24', { ...validPuzzle, songClue: 'Later' }, [
      '10.webp',
      '2.png',
    ]);
    writePuzzle('2026-07-22', { ...validPuzzle, songClue: 'Earlier' });

    expect(getPuzzleMetadata(puzzleDirectory)).toEqual({
      puzzleIndex: [
        { id: '2026-07-22', songClue: 'Earlier' },
        { id: '2026-07-24', songClue: 'Later' },
      ],
      puzzlePanels: {
        '2026-07-22': [
          { src: '/content/puzzles/2026-07-22/1.webp' },
        ],
        '2026-07-24': [
          { src: '/content/puzzles/2026-07-24/2.png' },
          { src: '/content/puzzles/2026-07-24/10.webp' },
        ],
      },
    });
  });

  it('rejects an impossible dated directory', () => {
    writePuzzle('2026-02-30', validPuzzle);

    expect(() => getPuzzleMetadata(puzzleDirectory)).toThrow(
      'Invalid puzzle date directory: 2026-02-30',
    );
  });

  it('rejects a non-zero-padded puzzle directory', () => {
    writePuzzle('2026-7-24', validPuzzle);

    expect(() => getPuzzleMetadata(puzzleDirectory)).toThrow(
      'Invalid puzzle date directory: 2026-7-24',
    );
  });

  it('rejects a missing puzzle file', () => {
    mkdirSync(resolve(puzzleDirectory, '2026-07-22'));
    writeFileSync(
      resolve(puzzleDirectory, '2026-07-22', '1.webp'),
      '',
    );

    expect(() => getPuzzleMetadata(puzzleDirectory)).toThrow(
      'Puzzle is missing puzzle.json',
    );
  });

  it('rejects a puzzle without numeric panels', () => {
    writePuzzle('2026-07-22', validPuzzle, []);

    expect(() => getPuzzleMetadata(puzzleDirectory)).toThrow(
      'Puzzle has no numeric panel images',
    );
  });
});

describe('released content filtering', () => {
  it('filters generated manifests and future puzzle directories', () => {
    const today = new Date(2026, 6, 23, 12);

    expect(shouldCopyReleasedEntry('puzzles', fileEntry('index.json'), today))
      .toBe(false);
    expect(shouldCopyReleasedEntry('puzzles', fileEntry('panels.json'), today))
      .toBe(false);
    expect(shouldCopyReleasedEntry('puzzles', directoryEntry('2026-07-24'), today))
      .toBe(false);
    expect(shouldCopyReleasedEntry('puzzles', directoryEntry('2026-07-23'), today))
      .toBe(true);
    expect(shouldCopyReleasedEntry('', directoryEntry('how-to-play'), today))
      .toBe(true);
  });

  it('rejects malformed puzzle directories instead of copying them', () => {
    const today = new Date(2026, 6, 23, 12);

    expect(() => shouldCopyReleasedEntry(
      'puzzles',
      directoryEntry('2026-7-24'),
      today,
    )).toThrow('Invalid puzzle date directory: 2026-7-24');
  });

  it('copies shared and released content but omits future content', () => {
    const source = resolve(temporaryRoot, 'copy-source');
    const target = resolve(temporaryRoot, 'copy-target');
    const sourcePuzzles = resolve(source, 'puzzles');

    mkdirSync(resolve(source, 'how-to-play'), { recursive: true });
    mkdirSync(resolve(sourcePuzzles, '2026-07-23'), { recursive: true });
    mkdirSync(resolve(sourcePuzzles, '2026-07-24'), { recursive: true });
    writeFileSync(resolve(source, 'how-to-play', 'manifest.json'), '{}');
    writeFileSync(resolve(sourcePuzzles, 'index.json'), 'generated');
    writeFileSync(resolve(sourcePuzzles, 'panels.json'), 'generated');
    writeFileSync(resolve(sourcePuzzles, '2026-07-23', 'puzzle.json'), '{}');
    writeFileSync(resolve(sourcePuzzles, '2026-07-24', 'puzzle.json'), '{}');

    copyReleasedContent(source, target, {
      today: new Date(2026, 6, 23, 12),
    });

    expect(readFileSync(
      resolve(target, 'how-to-play', 'manifest.json'),
      'utf8',
    )).toBe('{}');
    expect(readFileSync(
      resolve(target, 'puzzles', '2026-07-23', 'puzzle.json'),
      'utf8',
    )).toBe('{}');
    expect(() => readFileSync(
      resolve(target, 'puzzles', '2026-07-24', 'puzzle.json'),
      'utf8',
    )).toThrow();
    expect(() => readFileSync(
      resolve(target, 'puzzles', 'index.json'),
      'utf8',
    )).toThrow();
  });

  it('writes released-only generated metadata', () => {
    writePuzzle('2026-07-23', { ...validPuzzle, songClue: 'Released' });
    writePuzzle('2026-07-24', { ...validPuzzle, songClue: 'Future' });
    const output = resolve(temporaryRoot, 'output-content');

    writeReleasedPuzzleMetadata(temporaryRoot, output, {
      today: new Date(2026, 6, 23, 12),
    });

    const index = JSON.parse(readFileSync(
      resolve(output, 'puzzles', 'index.json'),
      'utf8',
    ));
    const panels = JSON.parse(readFileSync(
      resolve(output, 'puzzles', 'panels.json'),
      'utf8',
    ));

    expect(index).toEqual([{ id: '2026-07-23', songClue: 'Released' }]);
    expect(Object.keys(panels)).toEqual(['2026-07-23']);
  });
});

function writePuzzle(id, puzzle, panelNames = ['1.webp']) {
  const directory = resolve(puzzleDirectory, id);

  mkdirSync(directory, { recursive: true });
  writeFileSync(
    resolve(directory, 'puzzle.json'),
    JSON.stringify(puzzle),
  );

  for (const panelName of panelNames) {
    writeFileSync(resolve(directory, panelName), '');
  }
}

function fileEntry(name) {
  return {
    name,
    isFile: () => true,
    isDirectory: () => false,
  };
}

function directoryEntry(name) {
  return {
    name,
    isFile: () => false,
    isDirectory: () => true,
  };
}
