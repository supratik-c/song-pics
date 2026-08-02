import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePublicPath } from './publicPath.ts';

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubDeployment(baseUrl: string, buildId = 'test-build'): void {
  vi.stubEnv('BASE_URL', baseUrl);
  vi.stubEnv('VITE_BUILD_ID', buildId);
}

describe('public path resolution', () => {
  it.each([
    'https://example.com/panel.webp',
    'http://example.com/panel.webp',
    '//example.com/panel.webp',
    'HTTPS://example.com/panel.webp',
  ])('leaves the absolute URL %s untouched', (url) => {
    stubDeployment('/song-pics/');

    expect(resolvePublicPath(url)).toBe(url);
  });

  it.each([
    { base: '/', expected: '/content/puzzles/index.json?v=test-build' },
    {
      base: '/song-pics/',
      expected: '/song-pics/content/puzzles/index.json?v=test-build',
    },
  ])('resolves a relative path beneath the $base base', ({
    base,
    expected,
  }) => {
    stubDeployment(base);

    expect(resolvePublicPath('content/puzzles/index.json')).toBe(expected);
  });

  it('strips a leading slash so the repository base is not doubled', () => {
    stubDeployment('/song-pics/');

    expect(resolvePublicPath('/content/puzzles/index.json')).toBe(
      '/song-pics/content/puzzles/index.json?v=test-build',
    );
  });

  it('appends the build ID to an existing query string', () => {
    stubDeployment('/');

    expect(resolvePublicPath('content/panels.json?puzzle=2026-07-23')).toBe(
      '/content/panels.json?puzzle=2026-07-23&v=test-build',
    );
  });

  it('keeps a fragment after the build ID', () => {
    stubDeployment('/');

    expect(resolvePublicPath('content/misc/notes.svg#double-semiquaver')).toBe(
      '/content/misc/notes.svg?v=test-build#double-semiquaver',
    );
  });

  it('encodes a build ID containing URL-significant characters', () => {
    stubDeployment('/', 'main branch&v=2');

    expect(resolvePublicPath('content/puzzles/index.json')).toBe(
      '/content/puzzles/index.json?v=main%20branch%26v%3D2',
    );
  });
});
