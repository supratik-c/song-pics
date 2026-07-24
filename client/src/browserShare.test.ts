import { describe, expect, it, vi } from 'vitest';
import {
  createBrowserShareGateway,
  isMobileSharePlatform,
} from './browserShare.ts';
import type { PuzzleShareRequest } from './share.ts';

const request: PuzzleShareRequest = {
  title: 'Scribble Bops — Guess the Song',
  text: 'What song are these suspicious scribbles trying to be?',
  url: 'https://example.test/share/2026-07-23/',
};

describe('mobile share platform policy', () => {
  it.each([
    ['Android', 'Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5],
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 'iPhone', 5],
    ['iPod', 'Mozilla/5.0 (iPod touch; CPU iPhone OS 18_0)', 'iPod', 5],
    ['iPad', 'Mozilla/5.0 (iPad; CPU OS 18_0)', 'iPad', 5],
  ])('recognizes %s', (_name, userAgent, platform, maxTouchPoints) => {
    expect(isMobileSharePlatform({
      userAgent,
      platform,
      maxTouchPoints,
    })).toBe(true);
  });

  it('recognizes iPadOS when it requests a desktop-class site', () => {
    expect(isMobileSharePlatform({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })).toBe(true);
  });

  it.each([
    ['Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 10],
    ['macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'MacIntel', 0],
    ['Linux', 'Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0],
    ['unknown', 'ExampleBrowser/1.0', '', 0],
  ])('keeps %s copy-first', (_name, userAgent, platform, maxTouchPoints) => {
    expect(isMobileSharePlatform({
      userAgent,
      platform,
      maxTouchPoints,
    })).toBe(false);
  });

  it('recognizes a mobile User-Agent Client Hint', () => {
    expect(isMobileSharePlatform({
      userAgent: 'ReducedUserAgent',
      platform: '',
      maxTouchPoints: 0,
      userAgentDataMobile: true,
    })).toBe(true);
  });
});

describe('browser share gateway', () => {
  it('shares only the playable invitation on supported mobile devices', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const gateway = createBrowserShareGateway({
      isMobilePlatform: true,
      share,
      legacyCopy: () => false,
    });

    expect(gateway.preferredAction).toBe('native-share');
    await expect(gateway.share(request)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: request.title,
      text: request.text,
      url: request.url,
    });
  });

  it('copies on desktop without opening an available native share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const gateway = createBrowserShareGateway({
      isMobilePlatform: false,
      share,
      writeText,
      legacyCopy: () => false,
    });

    expect(gateway.preferredAction).toBe('copy');
    await expect(gateway.share(request)).resolves.toBe('copied');
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(
      `${request.title}\n${request.text}\n${request.url}`,
    );
  });

  it('copies when mobile native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const gateway = createBrowserShareGateway({
      isMobilePlatform: true,
      writeText,
      legacyCopy: () => false,
    });

    expect(gateway.preferredAction).toBe('copy');
    await expect(gateway.share(request)).resolves.toBe('copied');
  });

  it('treats mobile dismissal as cancellation rather than copying', async () => {
    const writeText = vi.fn();
    const gateway = createBrowserShareGateway({
      isMobilePlatform: true,
      share: vi.fn().mockRejectedValue({ name: 'AbortError' }),
      writeText,
      legacyCopy: () => false,
    });

    await expect(gateway.share(request)).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies after an unexpected mobile share failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const gateway = createBrowserShareGateway({
      isMobilePlatform: true,
      share: vi.fn().mockRejectedValue(new Error('share failed')),
      writeText,
      legacyCopy: () => false,
    });

    await expect(gateway.share(request)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(request.url));
  });

  it('uses legacy copying after clipboard failure', async () => {
    const legacyCopy = vi.fn().mockReturnValue(true);
    const gateway = createBrowserShareGateway({
      isMobilePlatform: false,
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
      legacyCopy,
    });

    await expect(gateway.share(request)).resolves.toBe('copied');
    expect(legacyCopy).toHaveBeenCalledWith(expect.stringContaining(request.url));
  });

  it('reports failure when neither sharing nor copying works', async () => {
    const gateway = createBrowserShareGateway({
      isMobilePlatform: false,
      legacyCopy: () => false,
    });

    await expect(gateway.share(request)).resolves.toBe('failed');
  });
});
