import type { GameStateStore } from './storage.ts';

export type CompletionSource = {
  loadCompletedPuzzleIds: (
    puzzleIds: readonly string[],
  ) => Promise<ReadonlySet<string>>;
  loadSolvedPuzzleIds: (
    puzzleIds: readonly string[],
  ) => Promise<ReadonlySet<string>>;
};

export function createLocalCompletionSource(
  gameStateStore: GameStateStore,
): CompletionSource {
  return {
    loadCompletedPuzzleIds: async (puzzleIds) => {
      const completedPuzzleIds = new Set<string>();

      for (const puzzleId of puzzleIds) {
        if (gameStateStore.load(puzzleId).status !== 'playing') {
          completedPuzzleIds.add(puzzleId);
        }
      }

      return completedPuzzleIds;
    },
    loadSolvedPuzzleIds: async (puzzleIds) => {
      const solvedPuzzleIds = new Set<string>();

      for (const puzzleId of puzzleIds) {
        if (gameStateStore.load(puzzleId).status === 'solved') {
          solvedPuzzleIds.add(puzzleId);
        }
      }

      return solvedPuzzleIds;
    },
  };
}
