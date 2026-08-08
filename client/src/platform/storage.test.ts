import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../domain/types.ts';
import {
  createLocalCompletionSource,
} from './completion.ts';
import {
  artistRevealNoticeStorageKey,
  createLocalArtistRevealNoticeStore,
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

const initialState = { guesses: [], status: 'playing', artistRevealed: false };

describe('local game-state storage', () => {
  it('namespaces progress under the canonical product slug', () => {
    expect(storageKey('2026-07-23')).toBe('scribble-bops:2026-07-23');
  });

  it('namespaces progress under a custom namespace when provided', () => {
    expect(storageKey('2026-07-23', 'scribble-bops:dev:123')).toBe(
      'scribble-bops:dev:123:2026-07-23',
    );
  });

  it('round-trips state under a custom namespace', () => {
    const storage = createMemoryStorage();
    const store = createLocalGameStateStore({
      getStorage: () => storage,
      namespace: 'scribble-bops:dev:123',
    });

    store.save('2026-07-23', {
      guesses: ['answer'],
      status: 'solved',
      artistRevealed: false,
    });

    expect(store.load('2026-07-23')).toEqual({
      guesses: ['answer'],
      status: 'solved',
      artistRevealed: false,
    });
    expect(storage.values.has('scribble-bops:dev:123:2026-07-23')).toBe(true);
    expect(storage.values.has(storageKey('2026-07-23'))).toBe(false);
  });

  it.each([
    {
      guesses: ['one', 'two', 'three', 'four'],
      status: 'playing',
      artistRevealed: false,
    },
    { guesses: ['answer'], status: 'solved', artistRevealed: false },
    {
      guesses: ['one', 'two', 'three', 'four', 'answer'],
      status: 'solved',
      artistRevealed: false,
    },
    { guesses: [], status: 'revealed', artistRevealed: false },
    {
      guesses: ['one', 'two', 'three', 'four'],
      status: 'revealed',
      artistRevealed: false,
    },
    {
      guesses: ['one', 'two', 'three', 'four', 'five'],
      status: 'failed',
      artistRevealed: false,
    },
    {
      guesses: ['one'],
      status: 'playing',
      artistRevealed: true,
    },
    {
      guesses: ['one', 'two', 'three'],
      status: 'failed',
      artistRevealed: true,
    },
  ] as const)('round-trips a current $status state by puzzle ID', (state) => {
    const storage = createMemoryStorage();
    const store = createLocalGameStateStore({
      getStorage: () => storage,
    });

    store.save('2026-07-23', {
      guesses: [...state.guesses],
      status: state.status,
      artistRevealed: state.artistRevealed,
    });

    expect(store.load('2026-07-23')).toEqual(state);
    expect(
      storage.values.has(storageKey('2026-07-22')),
    ).toBe(false);
  });

  it.each([
    {
      name: 'an unknown field',
      value: {
        guesses: ['one'],
        status: 'playing',
        artistRevealed: false,
        extra: true,
      },
    },
    {
      name: 'a missing field',
      value: { status: 'playing' },
    },
    {
      name: 'a legacy record without artistRevealed',
      value: { guesses: ['one'], status: 'playing' },
    },
    {
      name: 'a non-boolean artistRevealed',
      value: {
        guesses: ['one'],
        status: 'playing',
        artistRevealed: 'yes',
      },
    },
    {
      name: 'an unknown status',
      value: {
        guesses: ['one'],
        status: 'complete',
        artistRevealed: false,
      },
    },
    {
      name: 'a partially malformed guess list',
      value: {
        guesses: ['one', 2],
        status: 'playing',
        artistRevealed: false,
      },
    },
    {
      name: 'an empty guess',
      value: { guesses: [''], status: 'playing', artistRevealed: false },
    },
    {
      name: 'a non-normalized guess',
      value: {
        guesses: ['Hey Jude'],
        status: 'playing',
        artistRevealed: false,
      },
    },
    {
      name: 'duplicate guesses',
      value: {
        guesses: ['one', 'one'],
        status: 'playing',
        artistRevealed: false,
      },
    },
    {
      name: 'a zero-attempt solved state',
      value: { guesses: [], status: 'solved', artistRevealed: false },
    },
    {
      name: 'an exhausted playing state',
      value: {
        guesses: ['one', 'two', 'three', 'four', 'five'],
        status: 'playing',
        artistRevealed: false,
      },
    },
    {
      name: 'a failed state below the attempt limit',
      value: {
        guesses: ['one', 'two'],
        status: 'failed',
        artistRevealed: false,
      },
    },
    {
      name: 'a revealed state at the attempt limit',
      value: {
        guesses: ['one', 'two', 'three', 'four', 'five'],
        status: 'revealed',
        artistRevealed: false,
      },
    },
    {
      name: 'a solved state above the attempt limit',
      value: {
        guesses: ['one', 'two', 'three', 'four', 'five', 'answer'],
        status: 'solved',
        artistRevealed: false,
      },
    },
    {
      name: 'a playing state exhausted once the reveal cost is included',
      value: {
        guesses: ['one', 'two', 'three'],
        status: 'playing',
        artistRevealed: true,
      },
    },
    {
      name: 'a failed state below the limit once the reveal cost is included',
      value: {
        guesses: ['one', 'two'],
        status: 'failed',
        artistRevealed: true,
      },
    },
  ])('rejects $name instead of repairing it', ({ value }) => {
    const key = storageKey('2026-07-23');
    const storage = createMemoryStorage({
      [key]: JSON.stringify(value),
    });
    const store = createLocalGameStateStore({
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual(initialState);
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
      getStorage: () => storage,
    });

    expect(store.load('2026-07-23')).toEqual(initialState);
    expect(storage.removeItem).toHaveBeenCalledWith(
      storageKey('2026-07-23'),
    );
  });

  it('degrades safely when browser storage is unavailable', () => {
    const store = createLocalGameStateStore({
      getStorage: () => {
        throw new Error('SecurityError');
      },
    });

    expect(store.load('2026-07-23')).toEqual(initialState);
    expect(() => {
      store.save('2026-07-23', {
        guesses: ['hey jude'],
        status: 'solved',
        artistRevealed: false,
      });
    }).not.toThrow();
  });

  it('degrades safely when a storage quota rejects a save', () => {
    const storage = createMemoryStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const store = createLocalGameStateStore({
      getStorage: () => storage,
    });

    expect(() => {
      store.save('2026-07-23', {
        guesses: ['hey jude'],
        status: 'solved',
        artistRevealed: false,
      });
    }).not.toThrow();
    expect(store.load('2026-07-23')).toEqual(initialState);
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

describe('local artist-reveal-notice storage', () => {
  it('namespaces the flag under the canonical product slug', () => {
    expect(artistRevealNoticeStorageKey()).toBe(
      'scribble-bops:artist-reveal-notice:v1',
    );
  });

  it('namespaces the flag under a custom namespace when provided', () => {
    expect(artistRevealNoticeStorageKey('scribble-bops:dev:123')).toBe(
      'scribble-bops:dev:123:artist-reveal-notice:v1',
    );
  });

  it('starts unseen and persists markSeen for a new store instance', () => {
    const storage = createMemoryStorage();
    const store = createLocalArtistRevealNoticeStore({
      getStorage: () => storage,
    });

    expect(store.hasSeen()).toBe(false);

    store.markSeen();

    expect(store.hasSeen()).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      artistRevealNoticeStorageKey(),
      'seen',
    );

    const nextStore = createLocalArtistRevealNoticeStore({
      getStorage: () => storage,
    });

    expect(nextStore.hasSeen()).toBe(true);
  });

  it('rejects and removes an unknown stored value', () => {
    const key = artistRevealNoticeStorageKey();
    const storage = createMemoryStorage({ [key]: 'yes' });
    const store = createLocalArtistRevealNoticeStore({
      getStorage: () => storage,
    });

    expect(store.hasSeen()).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith(key);
  });

  it('falls back to page memory when storage is unavailable, without leaking across instances', () => {
    const store = createLocalArtistRevealNoticeStore({
      getStorage: () => {
        throw new Error('SecurityError');
      },
    });

    expect(store.hasSeen()).toBe(false);

    store.markSeen();

    expect(store.hasSeen()).toBe(true);
    expect(
      createLocalArtistRevealNoticeStore({
        getStorage: () => {
          throw new Error('SecurityError');
        },
      }).hasSeen(),
    ).toBe(false);
  });
});

describe('local completion source', () => {
  it('derives completion from every terminal state asynchronously', async () => {
    const states: Record<string, GameState> = {
      playing: { guesses: [], status: 'playing', artistRevealed: false },
      solved: { guesses: ['answer'], status: 'solved', artistRevealed: false },
      revealed: { guesses: [], status: 'revealed', artistRevealed: false },
      failed: { guesses: ['wrong'], status: 'failed', artistRevealed: false },
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

  it('derives solved puzzles only, excluding revealed and failed', async () => {
    const states: Record<string, GameState> = {
      playing: { guesses: [], status: 'playing', artistRevealed: false },
      solved: { guesses: ['answer'], status: 'solved', artistRevealed: false },
      revealed: { guesses: [], status: 'revealed', artistRevealed: false },
      failed: { guesses: ['wrong'], status: 'failed', artistRevealed: false },
    };
    const stateStore: GameStateStore = {
      load: vi.fn((puzzleId) => states[puzzleId]),
      save: vi.fn(),
    };

    const solved = await createLocalCompletionSource(
      stateStore,
    ).loadSolvedPuzzleIds(Object.keys(states));

    expect(solved).toEqual(new Set(['solved']));
  });
});
