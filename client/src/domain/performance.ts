import { getAttemptsUsed } from './game.ts';
import type { GameRules } from './gameConfig.ts';
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
  rules: GameRules,
): PuzzlePerformance | null {
  if (state.status === 'playing') {
    return null;
  }

  return {
    puzzleId,
    outcome: state.status,
    attemptsUsed: getAttemptsUsed(state, rules),
  };
}
