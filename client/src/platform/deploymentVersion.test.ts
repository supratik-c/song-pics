import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../testSupport.ts';
import { ensureCurrentDeployment } from './deploymentVersion.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('deployment version loading', () => {
  it('uses a unique no-store request for the unversioned manifest', async () => {
    vi.stubEnv('DEV', false);
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    vi.stubGlobal('window', {
      location: { href: 'https://example.test/song-pics/?puzzle=2020-07-04' },
      history: { replaceState: vi.fn() },
    });
    const fetchMock = vi.fn(async (
      _input: string | URL | Request,
      _init?: RequestInit,
    ) => jsonResponse({ buildId: import.meta.env.VITE_BUILD_ID }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(ensureCurrentDeployment()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0];
    const url = new URL(String(input));

    expect(url.pathname).toBe('/build-version.json');
    expect(url.searchParams.get('check')).toBe('123456');
    expect(url.searchParams.has('v')).toBe(false);
    expect(init).toEqual({ cache: 'no-store' });
  });
});
