import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('How to Play loading', () => {
  it('uses the deployment-versioned URL with normal HTTP caching', async () => {
    const fetchMock = vi.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit,
    ) => jsonResponse({
      title: 'How to Play',
      introduction: 'Decode the drawings.',
      sections: [{ heading: 'Look', body: 'Study every panel.' }],
      demo: {
        clue: 'A clue',
        panels: [{ src: '1.webp', alt: 'A practice panel' }],
        answer: 'A Song',
        artist: 'An Artist',
      },
    }));

    vi.stubGlobal('fetch', fetchMock);
    const { loadHowToPlayManifest } = await import('./howToPlayLoader.ts');

    await loadHowToPlayManifest();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0];
    const url = new URL(String(input), 'https://example.test');

    expect(url.pathname).toBe('/content/how-to-play/manifest.json');
    expect(url.searchParams.has('v')).toBe(true);
    expect(init).toEqual({ cache: 'default' });
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
}
