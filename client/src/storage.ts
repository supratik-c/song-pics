import { createInitialGameState, normalizeText } from './game.ts';
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

      if (stored === null || stored === undefined) {
        return fallback;
      }

      try {
        const parsed: unknown = JSON.parse(stored);
        const state = parseStoredGameState(parsed, rules);

        if (state) {
          return state;
        }
      } catch {}

      tryStorage(getStorage, (storage) => storage.removeItem(key));
      return fallback;
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

function parseStoredGameState(
  value: unknown,
  rules: GameRules,
): GameState | null {
  if (!isRecord(value) || !hasExactGameStateKeys(value)) {
    return null;
  }

  if (
    !Array.isArray(value.guesses) ||
    !value.guesses.every(isStoredGuess) ||
    new Set(value.guesses).size !== value.guesses.length ||
    !isGameStatus(value.status)
  ) {
    return null;
  }

  const attemptsUsed = value.guesses.length;
  const hasValidAttemptCount = value.status === 'failed'
    ? attemptsUsed === rules.maxAttempts
    : value.status === 'solved'
      ? attemptsUsed >= 1 && attemptsUsed <= rules.maxAttempts
      : attemptsUsed < rules.maxAttempts;

  if (!hasValidAttemptCount) {
    return null;
  }

  return {
    guesses: [...value.guesses],
    status: value.status,
  };
}

function hasExactGameStateKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return keys.length === 2 &&
    Object.hasOwn(value, 'guesses') &&
    Object.hasOwn(value, 'status');
}

function isStoredGuess(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    normalizeText(value) === value;
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
