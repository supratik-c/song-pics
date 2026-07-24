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
      title: 'Scribble Bops — Guess the Song',
      text:
        'Issue #4: What song are these suspicious scribbles trying to be?',
      url: 'https://example.test/share/2026-07-23/',
    });
  });

  it('formats a useful clipboard fallback', () => {
    const request = createPuzzleShareRequest(
      puzzle,
      'https://example.test/share/2026-07-23/',
    );

    expect(getCopyText(request)).toBe(
      'Scribble Bops — Guess the Song\n' +
      'Issue #4: What song are these suspicious scribbles trying to be?\n' +
      'https://example.test/share/2026-07-23/',
    );
  });
});
