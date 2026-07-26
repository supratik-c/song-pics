import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPuzzle } from './puzzleLoader.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('puzzle lyric loading', () => {
  it('rejects lyric lines that do not match the loaded panel count', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('/index.json')) {
        return jsonResponse([
          { id: '2026-07-04', songClue: 'A clue' },
        ]);
      }

      if (url.includes('/puzzle.json')) {
        return jsonResponse({
          songClue: 'A clue',
          songTitle: 'A Song',
          artist: 'An Artist',
          acceptedAnswers: ['A Song'],
          lyricLines: ['Only one line'],
        });
      }

      return jsonResponse({
        '2026-07-04': [
          { src: '/content/puzzles/2026-07-04/1.webp' },
          { src: '/content/puzzles/2026-07-04/2.webp' },
        ],
      });
    }));

    await expect(loadPuzzle('2026-07-04')).rejects.toThrow(
      'Puzzle lyricLines must contain exactly 2 lines to match 2 panels: 2026-07-04',
    );
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
}
