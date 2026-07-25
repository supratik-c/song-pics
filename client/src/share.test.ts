import { describe, expect, it } from 'vitest';
import {
  createPuzzleShareRequest,
  getCopyText,
} from './share.ts';
import type { PuzzleClue } from './types.ts';

const puzzle: PuzzleClue = {
  id: '2026-07-23',
  displayDate: '23 July 2026',
  issueNumber: 4,
  songClue: 'A spoiler-free clue',
  panels: [
    { src: '/content/puzzles/2026-07-23/2.WebP?v=build' },
  ],
};

describe('puzzle share request', () => {
  it('builds a spoiler-free invitation for the selected issue', () => {
    const request = createPuzzleShareRequest(
      puzzle,
      'https://example.test/share/2026-07-23/',
    );

    expect(request).toEqual({
      title: 'Scribble Bops',
      text:
        "Can you guess today's song from some questionable hand-drawn doodles?",
      url: 'https://example.test/share/2026-07-23/',
    });
  });

  it('formats a useful clipboard fallback', () => {
    const request = createPuzzleShareRequest(
      puzzle,
      'https://example.test/share/2026-07-23/',
    );

    expect(getCopyText(request)).toBe(
      'Scribble Bops\n' +
      "Can you guess today's song from some questionable hand-drawn doodles?\n" +
      'https://example.test/share/2026-07-23/',
    );
  });
});
