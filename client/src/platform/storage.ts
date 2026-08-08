import {
  createInitialGameState,
  getAttemptsUsed,
  normalizeText,
} from '../domain/game.ts';
import { GAME_RULES, type GameRules } from '../domain/gameConfig.ts';
import type { GameState, GameStatus } from '../domain/types.ts';
import { isRecord } from '../content/validation.ts';

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type GameStateStore = {
  load: (puzzleId: string) => GameState;
  save: (puzzleId: string, state: GameState) => void;
};

export type YouTubeConsentStore = {
  hasConsent: () => boolean;
  grant: () => void;
};

export type ArtistRevealNoticeStore = {
  hasSeen: () => boolean;
  markSeen: () => void;
};

export const YOUTUBE_CONSENT_STORAGE_KEY =
  'scribble-bops:youtube-consent:v1';
const YOUTUBE_CONSENT_GRANTED_VALUE = 'granted';
const ARTIST_REVEAL_NOTICE_SEEN_VALUE = 'seen';

const DEFAULT_STORAGE_NAMESPACE = 'scribble-bops';

export type LocalGameStateStoreOptions = {
  getStorage?: () => StorageAdapter;
  rules?: GameRules;
  namespace?: string;
};

export function createLocalGameStateStore({
  getStorage = () => localStorage,
  rules = GAME_RULES,
  namespace = DEFAULT_STORAGE_NAMESPACE,
}: LocalGameStateStoreOptions = {}): GameStateStore {
  return {
    load: (puzzleId) => {
      const fallback = createInitialGameState();
      const key = storageKey(puzzleId, namespace);

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
      tryStorage(getStorage, (storage) => {
        storage.setItem(storageKey(puzzleId, namespace), JSON.stringify(state));
      });
    },
  };
}

export function createSessionYouTubeConsentStore(
  getStorage: () => StorageAdapter = () => sessionStorage,
): YouTubeConsentStore {
  let memoryConsent = false;

  return {
    hasConsent: () => {
      const stored = tryStorage(
        getStorage,
        (storage) => storage.getItem(YOUTUBE_CONSENT_STORAGE_KEY),
      );

      if (stored === YOUTUBE_CONSENT_GRANTED_VALUE) {
        memoryConsent = true;
        return true;
      }

      if (stored !== null && stored !== undefined) {
        tryStorage(getStorage, (storage) => {
          storage.removeItem(YOUTUBE_CONSENT_STORAGE_KEY);
        });
      }

      return memoryConsent;
    },
    grant: () => {
      memoryConsent = true;
      tryStorage(getStorage, (storage) => {
        storage.setItem(
          YOUTUBE_CONSENT_STORAGE_KEY,
          YOUTUBE_CONSENT_GRANTED_VALUE,
        );
      });
    },
  };
}

export type LocalArtistRevealNoticeStoreOptions = {
  getStorage?: () => StorageAdapter;
  namespace?: string;
};

export function artistRevealNoticeStorageKey(
  namespace: string = DEFAULT_STORAGE_NAMESPACE,
): string {
  return `${namespace}:artist-reveal-notice:v1`;
}

// Permanent (unlike the YouTube consent store's session scope) and
// puzzle-independent (unlike game state) — the player answers this at most
// once, ever, across every puzzle. Takes the { getStorage, namespace }
// options shape createLocalGameStateStore uses, not the YouTube store's
// bare positional getStorage, so main.ts can apply the same dev/prod
// namespace split it already applies to game-state persistence.
export function createLocalArtistRevealNoticeStore({
  getStorage = () => localStorage,
  namespace = DEFAULT_STORAGE_NAMESPACE,
}: LocalArtistRevealNoticeStoreOptions = {}): ArtistRevealNoticeStore {
  const key = artistRevealNoticeStorageKey(namespace);
  let memorySeen = false;

  return {
    hasSeen: () => {
      const stored = tryStorage(
        getStorage,
        (storage) => storage.getItem(key),
      );

      if (stored === ARTIST_REVEAL_NOTICE_SEEN_VALUE) {
        memorySeen = true;
        return true;
      }

      if (stored !== null && stored !== undefined) {
        tryStorage(getStorage, (storage) => storage.removeItem(key));
      }

      return memorySeen;
    },
    markSeen: () => {
      memorySeen = true;
      tryStorage(getStorage, (storage) => {
        storage.setItem(key, ARTIST_REVEAL_NOTICE_SEEN_VALUE);
      });
    },
  };
}

export function storageKey(
  puzzleId: string,
  namespace: string = DEFAULT_STORAGE_NAMESPACE,
): string {
  return `${namespace}:${puzzleId}`;
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
    !isGameStatus(value.status) ||
    typeof value.artistRevealed !== 'boolean'
  ) {
    return null;
  }

  const state: GameState = {
    guesses: [...value.guesses],
    status: value.status,
    artistRevealed: value.artistRevealed,
  };

  const attemptsUsed = getAttemptsUsed(state, rules);
  const hasValidAttemptCount = value.status === 'failed'
    ? attemptsUsed === rules.maxAttempts
    : value.status === 'solved'
      ? attemptsUsed >= 1 && attemptsUsed <= rules.maxAttempts
      : attemptsUsed < rules.maxAttempts;

  if (!hasValidAttemptCount) {
    return null;
  }

  return state;
}

function hasExactGameStateKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);

  return keys.length === 3 &&
    Object.hasOwn(value, 'guesses') &&
    Object.hasOwn(value, 'status') &&
    Object.hasOwn(value, 'artistRevealed');
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
