import type { GameStatus } from './types.ts';

export type SupportTriggerContext = {
  solvedPuzzleCount: number;
  status: GameStatus;
};

/**
 * Decides whether the Ko-fi support prompt should render for the current
 * game state. Kept pure and swappable so a new experiment is one exported
 * function here, activated by changing a single import in main.ts.
 */
export type SupportTrigger = (context: SupportTriggerContext) => boolean;

export const neverShowSupport: SupportTrigger = () => false;

export const alwaysShowSupport: SupportTrigger = () => true;

export function whenSolvedAtLeast(threshold: number): SupportTrigger {
  return (context) => context.solvedPuzzleCount >= threshold;
}
