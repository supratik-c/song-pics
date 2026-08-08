import { describe, expect, it } from 'vitest';
import { revealSong, submitGuess } from './game.ts';
import { GAME_RULES } from './gameConfig.ts';
import { getPuzzlePerformance } from './performance.ts';
import type { GameState } from './types.ts';

const puzzleId = '2026-07-23';

describe('puzzle performance', () => {
  it('does not create terminal performance while play continues', () => {
    expect(getPuzzlePerformance(puzzleId, {
      guesses: ['first try'],
      status: 'playing',
      artistRevealed: false,
    }, GAME_RULES)).toBeNull();
  });

  it.each([
    ['solved', ['first try', 'correct'], false, 2],
    ['failed', ['one', 'two', 'three', 'four', 'five'], false, 5],
    ['revealed', [], false, 0],
  ] as const)(
    'derives %s performance from recorded attempts',
    (outcome, guesses, artistRevealed, attemptsUsed) => {
      const state: GameState = {
        guesses: [...guesses],
        status: outcome,
        artistRevealed,
      };

      expect(getPuzzlePerformance(puzzleId, state, GAME_RULES)).toEqual({
        puzzleId,
        outcome,
        attemptsUsed,
      });
    },
  );

  it('counts a spent artist reveal toward attempts used', () => {
    const state: GameState = {
      guesses: ['one', 'two', 'three'],
      status: 'failed',
      artistRevealed: true,
    };

    expect(getPuzzlePerformance(puzzleId, state, GAME_RULES)).toEqual({
      puzzleId,
      outcome: 'failed',
      attemptsUsed: 3 + GAME_RULES.artistRevealCost,
    });
  });

  it('does not count an invalid submission as an attempt', () => {
    const state: GameState = {
      guesses: [],
      status: 'playing',
      artistRevealed: false,
    };
    const submission = submitGuess(
      state,
      '',
      { acceptedAnswers: ['A Song'] },
      GAME_RULES,
    );

    expect(submission.kind).toBe('invalid');
    expect(
      getPuzzlePerformance(puzzleId, revealSong(state), GAME_RULES),
    ).toEqual({
      puzzleId,
      outcome: 'revealed',
      attemptsUsed: 0,
    });
  });
});
