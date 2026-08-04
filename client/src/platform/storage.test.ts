import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../domain/types.ts';
import {
  createLocalCompletionSource,
} from './completion.ts';
import {
  createLocalGameStateStore,
  createSessionYouTubeConsentStore,
  storageKey,
  YOUTUBE_CONSENT_STORAGE_KEY,
  type GameStateStore,
} from './storage.ts';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe('local game-state storage', () => {
  it('namespaces progress under the canonical product slug', () => {
    expect(storageKey('2026-07-23')).toBe('scribble-bops:2026-07-23');
  });

  it.each([
    { guesses: ['one', 'two', 'three', 'four'], status: 'playing' },
    { guesses: ['answer'], status: 'solved' },
    {
      guesses: ['one', 'two', 'three', 'four', 'answer'],
      status: 'solved',
    },
    { guesses: [], status: 'revealed' },
    { guesses: ['one', 'two', 'three', 'four'], status: 'revealed' },
    {
      guesses: ['one', 'two', 'three', 'four', 'five'],
      status: 'failed',
    },
  ] as const)('round-trips a current $status state by puzzle ID', (state) => {
    const storage = createMemoryStorage();
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    store.save('2026-07-23', {
      guesses: [...state.guesses],
      status: state.status,
    });

    expect(store.load('2026-07-23')).toEqual(state);
    expect(
      storage.values.has(storageKey('2026-07-22')),
    ).toBe(false);
  });

  it.each([
    {
      name: 'an unknown field',
      value: { guesses: ['one'], status: 'playing', extra: true },
    },
    {
      name: 'a missing field',
      value: { status: 'playing' },
    },
    {
      name: 'an unknown status',
      value: { guesses: ['one'], status: 'complete' },
    },
    {
      name: 'a partially malformed guess list',
      value: { guesses: ['one', 2], status: 'playing' },
    },
    {
      name: 'an empty guess',
      value: { guesses: [''], status: 'playing' },
    },
    {
      name: 'a non-normalized guess',
      value: { guesses: ['Hey Jude'], status: 'playing' },
    },
    {
      name: 'duplicate guesses',
      value: { guesses: ['one', 'one'], status: 'playing' },
    },
    {
      name: 'a zero-attempt solved state',
      value: { guesses: [], status: 'solved' },
    },
    {
      name: 'an exhausted playing state',
      value: {
        guesses: ['one', 'two', 'three', 'four', 'five'],
        status: 'playing',
      },
    },
    {
      name: 'a failed state below the attempt limit',
      value: { guesses: ['one', 'two'], status: 'failed' },
    },
    {
      name: 'a revealed state at the attempt limit',
      value: {
        guesses: ['one', 'two', 'three', 'four', 'five'],
        status: 'revealed',
      },
    },
    {
      name: 'a solved state above the attempt limit',
      value: {
        guesses: ['one', 'two', 'three', 'four', 'five', 'answer'],
        status: 'solved',
      },
    },
  ])('rejects $name instead of repairing it', ({ value }) => {
    const key = storageKey('2026-07-23');
    const storage = createMemoryStorage({
      [key]: JSON.stringify(value),
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: [],
      status: 'playing',
    });
    expect(storage.removeItem).toHaveBeenCalledWith(key);
    expect(storage.values.has(key)).toBe(false);
  });

  it.each([
    'not json',
    JSON.stringify(null),
    JSON.stringify([]),
  ])('falls back for malformed stored data: %s', (storedValue) => {
    const storage = createMemoryStorage({
      [storageKey('2026-07-23')]: storedValue,
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: [],
      status: 'playing',
    });
    expect(storage.removeItem).toHaveBeenCalledWith(
      storageKey('2026-07-23'),
    );
  });

  it('clears stale progress and ignores saves when persistence is disabled', () => {
    const key = storageKey('2026-07-23');
    const storage = createMemoryStorage({
      [key]: JSON.stringify({ guesses: ['one'], status: 'playing' }),
    });
    const store = createLocalGameStateStore({
      shouldPersist: false,
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: [],
      status: 'playing',
    });
    expect(storage.removeItem).toHaveBeenCalledWith(key);

    store.save('2026-07-23', {
      guesses: ['hey jude'],
      status: 'solved',
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('degrades safely when browser storage is unavailable', () => {
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => {
        throw new Error('SecurityError');
      },
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: [],
      status: 'playing',
    });
    expect(() => {
      store.save('2026-07-23', {
        guesses: ['hey jude'],
        status: 'solved',
      });
    }).not.toThrow();
  });

  it('degrades safely when a storage quota rejects a save', () => {
    const storage = createMemoryStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    expect(() => {
      store.save('2026-07-23', {
        guesses: ['hey jude'],
        status: 'solved',
      });
    }).not.toThrow();
    expect(store.load('2026-07-23')).toEqual({
      guesses: [],
      status: 'playing',
    });
  });
});

describe('session YouTube consent storage', () => {
  it('starts without consent and grants it for the browser session', () => {
    const storage = createMemoryStorage();
    const store = createSessionYouTubeConsentStore(() => storage);

    expect(store.hasConsent()).toBe(false);

    store.grant();

    expect(store.hasConsent()).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      YOUTUBE_CONSENT_STORAGE_KEY,
      'granted',
    );
  });

  it('shares granted consent with a new store in the same session', () => {
    const storage = createMemoryStorage();

    createSessionYouTubeConsentStore(() => storage).grant();

    const nextStore = createSessionYouTubeConsentStore(() => storage);

    expect(nextStore.hasConsent()).toBe(true);
  });

  it('rejects and removes an unknown stored value', () => {
    const storage = createMemoryStorage({
      [YOUTUBE_CONSENT_STORAGE_KEY]: 'yes',
    });
    const store = createSessionYouTubeConsentStore(() => storage);

    expect(store.hasConsent()).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith(
      YOUTUBE_CONSENT_STORAGE_KEY,
    );
  });

  it('falls back to page memory when session storage is unavailable', () => {
    const store = createSessionYouTubeConsentStore(() => {
      throw new Error('SecurityError');
    });

    expect(store.hasConsent()).toBe(false);

    store.grant();

    expect(store.hasConsent()).toBe(true);
    expect(
      createSessionYouTubeConsentStore(() => {
        throw new Error('SecurityError');
      }).hasConsent(),
    ).toBe(false);
  });
});

describe('local completion source', () => {
  it('derives completion from every terminal state asynchronously', async () => {
    const states: Record<string, GameState> = {
      playing: { guesses: [], status: 'playing' },
      solved: { guesses: ['answer'], status: 'solved' },
      revealed: { guesses: [], status: 'revealed' },
      failed: { guesses: ['wrong'], status: 'failed' },
    };
    const stateStore: GameStateStore = {
      load: vi.fn((puzzleId) => states[puzzleId]),
      save: vi.fn(),
    };

    const completed = await createLocalCompletionSource(
      stateStore,
    ).loadCompletedPuzzleIds(Object.keys(states));

    expect(completed).toEqual(new Set(['solved', 'revealed', 'failed']));
    expect(stateStore.load).toHaveBeenCalledTimes(4);
  });
});
