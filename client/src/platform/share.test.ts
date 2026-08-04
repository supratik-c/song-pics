import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState, submitGuess } from '../domain/game.ts';
import { GAME_RULES } from '../domain/gameConfig.ts';
import { getPuzzlePerformance } from '../domain/performance.ts';
import type { GameState } from '../domain/types.ts';
import {
  createPuzzleShareRequest,
  getCopyText,
  shareCurrentPuzzle,
} from './share.ts';

const puzzleId = '2026-07-23';
const shareUrl = 'https://example.test/share/2026-07-23/';

describe('puzzle share request', () => {
  it.each([
    [1, 'I got it in 1 guess!'],
    [2, 'I got it in 2 guesses!'],
  ])('formats a solved result after %i recorded attempts', (
    attemptsUsed,
    performanceLine,
  ) => {
    const request = createPuzzleShareRequest(shareUrl, {
      puzzleId,
      outcome: 'solved',
      attemptsUsed,
    });

    expect(request).toEqual({
      title: 'Scribble Bops',
      text:
        "Can you guess today's song from some questionable hand-drawn doodles?\n" +
        performanceLine,
      url: shareUrl,
    });
  });

  it.each(['failed', 'revealed'] as const)(
    'uses the surrender challenge for a %s result',
    (outcome) => {
      const request = createPuzzleShareRequest(shareUrl, {
        puzzleId,
        outcome,
        attemptsUsed: outcome === 'failed' ? 5 : 2,
      });

      expect(request.text).toContain(
        'Or will you succumb to the scribbles?',
      );
      expect(request.text).not.toContain('5 guesses');
      expect(request.text).not.toContain('2 guesses');
    },
  );

  it('formats the clipboard invitation in the intended line order', () => {
    const request = createPuzzleShareRequest(shareUrl, {
      puzzleId,
      outcome: 'solved',
      attemptsUsed: 1,
    });

    expect(getCopyText(request)).toBe(
      'Scribble Bops\n' +
      "Can you guess today's song from some questionable hand-drawn doodles?\n" +
      'I got it in 1 guess!\n' +
      shareUrl,
    );
  });

  it('resolves performance from the latest state when sharing begins', async () => {
    let state: GameState = createInitialGameState();
    const share = vi.fn().mockResolvedValue('copied' as const);
    const getRequest = () => {
      const performance = getPuzzlePerformance(puzzleId, state);

      if (!performance) {
        throw new Error('Performance is not terminal.');
      }

      return createPuzzleShareRequest(shareUrl, performance);
    };

    state = recordGuess(state, 'first attempt');
    state = recordGuess(state, 'winning attempt');

    const attempt = await shareCurrentPuzzle(getRequest, share);

    expect(attempt.outcome).toBe('copied');
    expect(attempt.request.text).toContain('I got it in 2 guesses!');
    expect(share).toHaveBeenCalledWith(attempt.request);
  });

  it('does not expose submitted guess text', () => {
    const performance = getPuzzlePerformance(puzzleId, {
      guesses: ['secret wrong answer', 'secret correct answer'],
      status: 'solved',
    });

    expect(performance).not.toBeNull();
    const request = createPuzzleShareRequest(shareUrl, performance!);

    expect(getCopyText(request)).not.toContain('secret wrong answer');
    expect(getCopyText(request)).not.toContain('secret correct answer');
  });
});

function recordGuess(state: GameState, guess: string): GameState {
  const submission = submitGuess(
    state,
    guess,
    {
      acceptedAnswers: ['winning attempt'],
    },
    GAME_RULES,
  );

  if (submission.kind !== 'recorded') {
    throw new Error(`Expected a recorded guess, got ${submission.reason}.`);
  }

  return submission.state;
}
