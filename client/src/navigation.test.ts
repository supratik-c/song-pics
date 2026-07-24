import { describe, expect, it } from 'vitest';
import type { PuzzleArchive } from './types.ts';
import {
  buildCanonicalPuzzleUrl,
  buildPuzzleShareUrl,
  buildPuzzleUrl,
  getAdjacentPuzzleIds,
  getRequestedPuzzleId,
  getSharePuzzleId,
} from './navigation.ts';

const archiveEntries = [
  { id: '2026-07-23', issueNumber: 3, songClue: 'Newest clue' },
  { id: '2026-07-21', issueNumber: 2, songClue: 'Middle clue' },
  { id: '2026-07-20', issueNumber: 1, songClue: 'Oldest clue' },
];

function createArchive(selectedPuzzleId: string): PuzzleArchive {
  return {
    entries: archiveEntries,
    latestPuzzleId: archiveEntries[0].id,
    selectedPuzzleId,
  };
}

describe('puzzle navigation', () => {
  it('finds the chronologically adjacent issues from a middle issue', () => {
    expect(getAdjacentPuzzleIds(createArchive('2026-07-21'))).toEqual({
      previousPuzzleId: '2026-07-20',
      nextPuzzleId: '2026-07-23',
    });
  });

  it('has no next issue when the latest issue is selected', () => {
    expect(getAdjacentPuzzleIds(createArchive('2026-07-23'))).toEqual({
      previousPuzzleId: '2026-07-21',
      nextPuzzleId: null,
    });
  });

  it('has no previous issue when the oldest issue is selected', () => {
    expect(getAdjacentPuzzleIds(createArchive('2026-07-20'))).toEqual({
      previousPuzzleId: null,
      nextPuzzleId: '2026-07-21',
    });
  });

  it('returns no adjacent issues for an unavailable selection', () => {
    expect(getAdjacentPuzzleIds(createArchive('2026-07-24'))).toEqual({
      previousPuzzleId: null,
      nextPuzzleId: null,
    });
  });

  it('returns no requested puzzle when the query is absent', () => {
    expect(getRequestedPuzzleId('')).toBeNull();
    expect(getRequestedPuzzleId('?campaign=doodles')).toBeNull();
  });

  it('reads the requested puzzle without validating policy', () => {
    expect(
      getRequestedPuzzleId('?campaign=doodles&puzzle=2026-07-23'),
    ).toBe('2026-07-23');
    expect(getRequestedPuzzleId('?puzzle=not-a-date')).toBe('not-a-date');
  });

  it('reads a valid puzzle ID from a base-aware share path', () => {
    expect(
      getSharePuzzleId(
        '/song-pics/share/2026-07-23/',
        '/song-pics/',
      ),
    ).toBe('2026-07-23');
    expect(getSharePuzzleId('/share/2024-02-29', '/')).toBe('2024-02-29');
  });

  it('ignores unrelated and invalid share paths', () => {
    expect(
      getSharePuzzleId('/other/share/2026-07-23/', '/song-pics/'),
    ).toBeNull();
    expect(getSharePuzzleId('/share/2026-02-30/', '/')).toBeNull();
    expect(getSharePuzzleId('/share/not-a-date/', '/')).toBeNull();
  });

  it('builds a stable dated share URL without transient URL state', () => {
    expect(
      buildPuzzleShareUrl(
        'https://example.test/song-pics/?campaign=doodles#result',
        '2026-07-23',
        '/song-pics/',
      ),
    ).toBe('https://example.test/song-pics/share/2026-07-23/');
  });

  it('normalizes a share entry to the canonical puzzle query URL', () => {
    expect(
      buildCanonicalPuzzleUrl(
        'https://example.test/song-pics/share/2026-07-23/?ignored=1#result',
        '2026-07-23',
        '/song-pics/',
      ),
    ).toBe('https://example.test/song-pics/?puzzle=2026-07-23');
  });

  it('uses the canonical latest URL while preserving other query and hash data', () => {
    const url = buildPuzzleUrl(
      'https://example.test/game/?campaign=doodles&puzzle=2026-07-22#archive',
      '2026-07-23',
      '2026-07-23',
    );

    expect(url).toBe(
      'https://example.test/game/?campaign=doodles#archive',
    );
  });

  it('sets an archive puzzle while preserving base path and unrelated state', () => {
    const url = buildPuzzleUrl(
      'https://example.test/song-pics/?campaign=doodles&_deployment=abc#archive',
      '2026-07-20',
      '2026-07-23',
    );

    expect(url).toBe(
      'https://example.test/song-pics/?campaign=doodles&_deployment=abc&puzzle=2026-07-20#archive',
    );
  });
});
