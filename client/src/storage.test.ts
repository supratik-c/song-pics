import { describe, expect, it, vi } from 'vitest';
import {
  createLocalCompletionSource,
} from './completion.ts';
import {
  createLocalGameStateStore,
  storageKey,
  type GameStateStore,
} from './storage.ts';
import type { GameState } from './types.ts';

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
  it('round-trips current game state by puzzle ID', () => {
    const storage = createMemoryStorage();
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });
    const state: GameState = {
      guesses: ['first guess'],
      status: 'revealed',
    };

    store.save('2026-07-23', state);

    expect(store.load('2026-07-23')).toEqual(state);
    expect(
      storage.values.has(storageKey('2026-07-22')),
    ).toBe(false);
  });

  it('migrates solved legacy state', () => {
    const key = storageKey('2026-07-23');
    const storage = createMemoryStorage({
      [key]: JSON.stringify({ guesses: ['hey jude'], isSolved: true }),
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: ['hey jude'],
      status: 'solved',
    });
  });

  it('migrates an exhausted legacy state to failed', () => {
    const guesses = ['one', 'two', 'three', 'four', 'five'];
    const storage = createMemoryStorage({
      [storageKey('2026-07-23')]: JSON.stringify({
        guesses,
        isSolved: false,
      }),
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses,
      status: 'failed',
    });
  });

  it('migrates unfinished legacy state to playing', () => {
    const storage = createMemoryStorage({
      [storageKey('2026-07-23')]: JSON.stringify({
        guesses: ['one', 'two'],
        isSolved: false,
      }),
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: ['one', 'two'],
      status: 'playing',
    });
  });

  it('repairs an exhausted current playing state and filters bad guesses', () => {
    const storage = createMemoryStorage({
      [storageKey('2026-07-23')]: JSON.stringify({
        guesses: ['one', 2, 'three'],
        status: 'playing',
      }),
    });
    const store = createLocalGameStateStore({
      shouldPersist: true,
      getStorage: () => storage,
      rules: { maxAttempts: 2, maxAnswerLength: 64 },
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: ['one', 'three'],
      status: 'failed',
    });
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
