import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../testSupport.ts';
import { fetchStaticJson, isRecord } from './validation.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('static JSON fetching', () => {
  it('uses no-store by default', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: 'fresh' }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchStaticJson(
      '/build-version.json?check=123',
      'build version',
      isRecord,
    )).resolves.toEqual({ value: 'fresh' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/build-version.json?check=123',
      { cache: 'no-store' },
    );
  });

  it('accepts normal HTTP caching for versioned content', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: 'cached' }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchStaticJson(
      '/content/puzzles/index.json?v=build-123',
      'puzzle list',
      isRecord,
      { cache: 'default' },
    )).resolves.toEqual({ value: 'cached' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/content/puzzles/index.json?v=build-123',
      { cache: 'default' },
    );
  });
});
