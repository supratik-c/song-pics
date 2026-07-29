import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPuzzle } from './puzzleLoader.ts';
import { FuturePuzzleError } from './types.ts';

type ControlledRequest = {
  input: string | URL | Request;
  init: RequestInit | undefined;
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('puzzle loading requests', () => {
  it('starts released archive metadata and puzzle requests together', async () => {
    const requests = installControlledFetch();
    const loadedPuzzlePromise = loadPuzzle('2020-07-04');

    expect(requests.keys()).toEqual([
      'index',
      'panels',
      'puzzle:2020-07-04',
    ]);
    expect(requests.values().every(
      ({ input }) => new URL(String(input), 'https://example.test')
        .searchParams.has('v'),
    )).toBe(true);
    expect(requests.values().every(
      ({ init }) => init?.cache === 'default',
    )).toBe(true);

    requests.resolve('puzzle:2020-07-04', puzzleJson('Archive clue'));
    requests.resolve('index', [
      { id: '2020-07-04', songClue: 'Archive clue' },
    ]);
    requests.resolve('panels', panelManifest('2020-07-04'));

    await expect(loadedPuzzlePromise).resolves.toMatchObject({
      puzzle: {
        id: '2020-07-04',
        issueNumber: 1,
        songClue: 'Archive clue',
      },
      archive: {
        latestPuzzleId: '2020-07-04',
        selectedPuzzleId: '2020-07-04',
      },
    });
  });

  it.each([null, 'not-a-date'])(
    'loads metadata before resolving the latest puzzle for %s',
    async (requestedPuzzleId) => {
      const requests = installControlledFetch();
      const loadedPuzzlePromise = loadPuzzle(requestedPuzzleId);

      expect(requests.keys()).toEqual(['index', 'panels']);

      requests.resolve('index', [
        { id: '2020-07-04', songClue: 'Older clue' },
        { id: '2020-07-05', songClue: 'Latest clue' },
      ]);
      requests.resolve('panels', panelManifest('2020-07-05'));
      await waitForRequest(requests, 'puzzle:2020-07-05');

      requests.resolve('puzzle:2020-07-05', puzzleJson('Latest clue'));

      await expect(loadedPuzzlePromise).resolves.toMatchObject({
        puzzle: { id: '2020-07-05', issueNumber: 2 },
        archive: {
          latestPuzzleId: '2020-07-05',
          selectedPuzzleId: '2020-07-05',
        },
      });
    },
  );

  it('loads only the archive index for a future puzzle', async () => {
    const requests = installControlledFetch();
    const loadedPuzzlePromise = loadPuzzle('2999-07-04');

    expect(requests.keys()).toEqual(['index']);
    requests.resolve('index', [
      { id: '2020-07-04', songClue: 'Released clue' },
    ]);

    const error = await loadedPuzzlePromise.catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(FuturePuzzleError);
    expect(error).toMatchObject({
      puzzleId: '2999-07-04',
      archive: {
        latestPuzzleId: '2020-07-04',
        selectedPuzzleId: '2999-07-04',
      },
    });
    expect(requests.keys()).toEqual(['index']);
  });

  it('does not await an unused speculative request before loading fallback', async () => {
    const requests = installControlledFetch();
    const loadedPuzzlePromise = loadPuzzle('2020-07-03');

    expect(requests.keys()).toEqual([
      'index',
      'panels',
      'puzzle:2020-07-03',
    ]);

    requests.resolve('index', [
      { id: '2020-07-04', songClue: 'Latest clue' },
    ]);
    requests.resolve('panels', panelManifest('2020-07-04'));
    await waitForRequest(requests, 'puzzle:2020-07-04');

    requests.resolve('puzzle:2020-07-04', puzzleJson('Latest clue'));

    await expect(loadedPuzzlePromise).resolves.toMatchObject({
      puzzle: { id: '2020-07-04' },
      archive: { selectedPuzzleId: '2020-07-04' },
    });
  });

  it('ignores a rejected speculative request when falling back', async () => {
    const requests = installControlledFetch();
    const loadedPuzzlePromise = loadPuzzle('2020-07-03');

    requests.reject(
      'puzzle:2020-07-03',
      new Error('Speculative puzzle was unavailable.'),
    );
    requests.resolve('index', [
      { id: '2020-07-04', songClue: 'Latest clue' },
    ]);
    requests.resolve('panels', panelManifest('2020-07-04'));
    await waitForRequest(requests, 'puzzle:2020-07-04');
    requests.resolve('puzzle:2020-07-04', puzzleJson('Latest clue'));

    await expect(loadedPuzzlePromise).resolves.toMatchObject({
      puzzle: { id: '2020-07-04' },
    });
  });

  it('propagates a speculative failure for a released puzzle', async () => {
    const requests = installControlledFetch();
    const loadedPuzzlePromise = loadPuzzle('2020-07-04');

    requests.reject(
      'puzzle:2020-07-04',
      new Error('Released puzzle could not be loaded.'),
    );
    requests.resolve('index', [
      { id: '2020-07-04', songClue: 'Archive clue' },
    ]);
    requests.resolve('panels', panelManifest('2020-07-04'));

    await expect(loadedPuzzlePromise).rejects.toThrow(
      'Released puzzle could not be loaded.',
    );
  });
});

describe('puzzle assembly', () => {
  it('rejects lyric lines that do not match the loaded panel count', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('/index.json')) {
        return jsonResponse([
          { id: '2020-07-04', songClue: 'A clue' },
        ]);
      }

      if (url.includes('/puzzle.json')) {
        return jsonResponse({
          ...puzzleJson('A clue'),
          lyricLines: ['Only one line'],
        });
      }

      return jsonResponse({
        '2020-07-04': [
          { src: '/content/puzzles/2020-07-04/1.webp' },
          { src: '/content/puzzles/2020-07-04/2.webp' },
        ],
      });
    }));

    await expect(loadPuzzle('2020-07-04')).rejects.toThrow(
      'Puzzle lyricLines must contain exactly 2 lines to match 2 panels: 2020-07-04',
    );
  });

  it('rejects a selected puzzle missing from the panel manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes('/index.json')) {
        return jsonResponse([
          { id: '2020-07-04', songClue: 'A clue' },
        ]);
      }

      if (url.includes('/puzzle.json')) {
        return jsonResponse(puzzleJson('A clue'));
      }

      return jsonResponse(panelManifest('2020-07-05'));
    }));

    await expect(loadPuzzle('2020-07-04')).rejects.toThrow(
      'Puzzle has no generated panels: 2020-07-04',
    );
  });
});

function installControlledFetch() {
  const requests = new Map<string, ControlledRequest>();

  vi.stubGlobal('fetch', vi.fn((
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const key = requestKey(input);

    if (requests.has(key)) {
      throw new Error(`Duplicate controlled request: ${key}`);
    }

    return new Promise<Response>((resolve, reject) => {
      requests.set(key, { input, init, resolve, reject });
    });
  }));

  return {
    keys: () => [...requests.keys()],
    values: () => [...requests.values()],
    has: (key: string) => requests.has(key),
    resolve: (key: string, value: unknown) => {
      getRequest(requests, key).resolve(jsonResponse(value));
    },
    reject: (key: string, reason: unknown) => {
      getRequest(requests, key).reject(reason);
    },
  };
}

async function waitForRequest(
  requests: ReturnType<typeof installControlledFetch>,
  key: string,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (requests.has(key)) {
      return;
    }

    await Promise.resolve();
  }

  throw new Error(`Request did not start: ${key}`);
}

function getRequest(
  requests: Map<string, ControlledRequest>,
  key: string,
): ControlledRequest {
  const request = requests.get(key);

  if (!request) {
    throw new Error(`Controlled request does not exist: ${key}`);
  }

  return request;
}

function requestKey(input: string | URL | Request): string {
  const pathname = new URL(String(input), 'https://example.test').pathname;

  if (pathname.endsWith('/index.json')) {
    return 'index';
  }

  if (pathname.endsWith('/panels.json')) {
    return 'panels';
  }

  const puzzleMatch = /\/puzzles\/(\d{4}-\d{2}-\d{2})\/puzzle\.json$/
    .exec(pathname);

  if (puzzleMatch) {
    return `puzzle:${puzzleMatch[1]}`;
  }

  throw new Error(`Unexpected request: ${pathname}`);
}

function puzzleJson(songClue: string) {
  return {
    songClue,
    songTitle: 'A Song',
    artist: 'An Artist',
    acceptedAnswers: ['A Song'],
  };
}

function panelManifest(puzzleId: string) {
  return {
    [puzzleId]: [
      { src: `/content/puzzles/${puzzleId}/1.webp` },
    ],
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
}
