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
    })).toBeNull();
  });

  it.each([
    ['solved', ['first try', 'correct'], 2],
    ['failed', ['one', 'two', 'three', 'four', 'five'], 5],
    ['revealed', [], 0],
  ] as const)(
    'derives %s performance from recorded attempts',
    (outcome, guesses, attemptsUsed) => {
      const state: GameState = { guesses: [...guesses], status: outcome };

      expect(getPuzzlePerformance(puzzleId, state)).toEqual({
        puzzleId,
        outcome,
        attemptsUsed,
      });
    },
  );

  it('does not count an invalid submission as an attempt', () => {
    const state: GameState = { guesses: [], status: 'playing' };
    const submission = submitGuess(
      state,
      '',
      { acceptedAnswers: ['A Song'] },
      GAME_RULES,
    );

    expect(submission.kind).toBe('invalid');
    expect(getPuzzlePerformance(puzzleId, revealSong(state))).toEqual({
      puzzleId,
      outcome: 'revealed',
      attemptsUsed: 0,
    });
  });
});
