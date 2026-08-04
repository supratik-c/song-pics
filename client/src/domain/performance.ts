import type { GameState, GameStatus } from './types.ts';

export type TerminalGameStatus = Exclude<GameStatus, 'playing'>;

export type PuzzlePerformance = {
  puzzleId: string;
  outcome: TerminalGameStatus;
  attemptsUsed: number;
};

export function getPuzzlePerformance(
  puzzleId: string,
  state: Readonly<GameState>,
): PuzzlePerformance | null {
  if (state.status === 'playing') {
    return null;
  }

  return {
    puzzleId,
    outcome: state.status,
    attemptsUsed: state.guesses.length,
  };
}
