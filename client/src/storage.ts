import { createInitialGameState } from './game.ts';
import { GAME_RULES, type GameRules } from './gameConfig.ts';
import type { GameState, GameStatus } from './types.ts';
import { isRecord } from './validation.ts';

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type GameStateStore = {
  load: (puzzleId: string) => GameState;
  save: (puzzleId: string, state: GameState) => void;
};

export type LocalGameStateStoreOptions = {
  shouldPersist: boolean;
  getStorage?: () => StorageAdapter;
  rules?: GameRules;
};

export function createLocalGameStateStore({
  shouldPersist,
  getStorage = () => localStorage,
  rules = GAME_RULES,
}: LocalGameStateStoreOptions): GameStateStore {
  return {
    load: (puzzleId) => {
      const fallback = createInitialGameState();
      const key = storageKey(puzzleId);

      if (!shouldPersist) {
        tryStorage(getStorage, (storage) => storage.removeItem(key));
        return fallback;
      }

      const stored = tryStorage(
        getStorage,
        (storage) => storage.getItem(key),
      );

      if (!stored) {
        return fallback;
      }

      try {
        const parsed: unknown = JSON.parse(stored);

        if (!isRecord(parsed)) {
          return fallback;
        }

        const guesses = Array.isArray(parsed.guesses)
          ? parsed.guesses.filter(
            (guess): guess is string => typeof guess === 'string',
          )
          : [];

        return {
          guesses,
          status: resolveStoredStatus(parsed, guesses.length, rules),
        };
      } catch {
        return fallback;
      }
    },
    save: (puzzleId, state) => {
      if (!shouldPersist) {
        return;
      }

      tryStorage(getStorage, (storage) => {
        storage.setItem(storageKey(puzzleId), JSON.stringify(state));
      });
    },
  };
}

export function storageKey(puzzleId: string): string {
  return `scribble-bops:${puzzleId}`;
}

function resolveStoredStatus(
  value: Record<string, unknown>,
  guessCount: number,
  rules: GameRules,
): GameStatus {
  if (isGameStatus(value.status)) {
    if (
      value.status === 'playing' &&
      guessCount >= rules.maxAttempts
    ) {
      return 'failed';
    }

    return value.status;
  }

  if (value.isSolved === true) {
    return 'solved';
  }

  if (guessCount >= rules.maxAttempts) {
    return 'failed';
  }

  return 'playing';
}

function isGameStatus(value: unknown): value is GameStatus {
  return (
    value === 'playing' ||
    value === 'solved' ||
    value === 'revealed' ||
    value === 'failed'
  );
}

function tryStorage<Result>(
  getStorage: () => StorageAdapter,
  operation: (storage: StorageAdapter) => Result,
): Result | undefined {
  try {
    return operation(getStorage());
  } catch {
    return undefined;
  }
}
