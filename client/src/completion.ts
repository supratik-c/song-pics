import { loadState } from './storage.ts';

export type LoadCompletedPuzzleIds = (
  puzzleIds: readonly string[],
) => Promise<ReadonlySet<string>>;

export const loadCompletedPuzzleIds: LoadCompletedPuzzleIds = async (
  puzzleIds,
) => {
  const completedPuzzleIds = new Set<string>();

  for (const puzzleId of puzzleIds) {
    if (loadState(puzzleId).status !== 'playing') {
      completedPuzzleIds.add(puzzleId);
    }
  }

  return completedPuzzleIds;
};
