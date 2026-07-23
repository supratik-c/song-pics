import { describe, expect, it } from 'vitest';
import { buildPuzzleUrl, getRequestedPuzzleId } from './navigation.ts';

describe('puzzle navigation', () => {
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
