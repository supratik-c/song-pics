import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameStatus, PuzzleSolution } from '../domain/types.ts';
import {
  clearResult,
  focusCompletedResult,
  getYouTubeVideoUrls,
  renderResult,
} from './resultView.ts';

const solution: PuzzleSolution = {
  songTitle: 'Counting Stars',
  artist: 'OneRepublic',
  acceptedAnswers: ['Counting Stars'],
  youtubeURL: 'https://www.youtube.com/watch?v=hT_nvWreIhg',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('inline result rendering', () => {
  it.each<[
    Exclude<GameStatus, 'playing'>,
    string,
    string,
    boolean,
  ]>([
    ['solved', 'Correct!', 'You decoded the doodles.', true],
    [
      'revealed',
      'Song Revealed',
      'The scribbles win this round. The song was:',
      true,
    ],
    [
      'failed',
      'Out of Guesses',
      'That was your last guess. The song was:',
      false,
    ],
  ])(
    'renders the %s outcome and its video policy',
    (status, title, message, hasVideoControl) => {
      const region = document.createElement('section');
      region.hidden = true;

      renderResult(region, solution, status, createConsent(false));

      expect(region.hidden).toBe(false);
      expect(region.dataset.outcome).toBe(status);
      expect(region.querySelector('.result-banner')?.textContent).toBe(title);
      expect(region.querySelector('.result-message')?.textContent).toBe(message);
      expect(region.querySelector('.result-answer')?.textContent).toBe(
        'Counting Stars by OneRepublic',
      );

      expect(region.querySelector('.result-video')).toBeNull();
      expect(region.querySelector('.youtube-watch-link')).toBeNull();

      const loadButton = region.querySelector('.youtube-load-button');

      expect(Boolean(loadButton)).toBe(hasVideoControl);
      if (loadButton) {
        expect(loadButton.children[1]?.textContent).toBe('Watch YouTube Video');
        expect(
          loadButton.children[0]?.getAttribute('aria-hidden'),
        ).toBe('true');

        const privacy = region.querySelector('.youtube-privacy-notice');
        const privacyLink = privacy?.querySelector('a');

        expect(privacy?.children[0]?.textContent).toBe('Subject to ');
        expect(privacyLink?.textContent).toBe("Google's Privacy Policy");
        expect(privacyLink?.href).toBe('https://policies.google.com/privacy');
        expect(privacyLink?.target).toBe('_blank');
        expect(privacyLink?.rel).toBe('noopener noreferrer');
      }
      expect(region.querySelector('img')).toBeNull();
    },
  );

  it('loads the privacy-enhanced player when the watch button is pressed', () => {
    const focusSpy = vi.spyOn(HTMLIFrameElement.prototype, 'focus');
    const region = document.createElement('section');
    const grantConsent = vi.fn();

    renderResult(region, solution, 'solved', createConsent(false, grantConsent));

    const loadButton =
      region.querySelector<HTMLButtonElement>('.youtube-load-button');

    expect(loadButton).not.toBeNull();
    loadButton?.click();

    const video = region.querySelector<HTMLIFrameElement>('.result-video');
    const watchLink =
      region.querySelector<HTMLAnchorElement>('.youtube-watch-link');

    expect(grantConsent).toHaveBeenCalledOnce();
    expect(video?.src).toBe(
      'https://www.youtube-nocookie.com/embed/hT_nvWreIhg',
    );
    expect(video?.title).toBe(
      'YouTube video player: Counting Stars by OneRepublic',
    );
    expect(video?.allow).toBe('encrypted-media; picture-in-picture');
    expect(video?.allowFullscreen).toBe(true);
    expect(video?.loading).toBe('lazy');
    expect(video?.referrerPolicy).toBe('strict-origin-when-cross-origin');
    expect(focusSpy).toHaveBeenCalledOnce();
    expect(watchLink?.href).toBe(
      'https://www.youtube.com/watch?v=hT_nvWreIhg',
    );
    expect(watchLink?.children[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(watchLink?.children[1]?.textContent).toBe('Watch on YouTube');

    loadButton?.click();
    expect(region.querySelector('.result-video')).toBe(video);
  });

  it('automatically loads a rerendered result after consent without moving focus', () => {
    const focusSpy = vi.spyOn(HTMLIFrameElement.prototype, 'focus');
    const region = document.createElement('section');
    let granted = false;
    const grantConsent = (): void => {
      granted = true;
    };

    renderResult(region, solution, 'solved', createConsent(false, grantConsent));
    region.querySelector<HTMLButtonElement>('.youtube-load-button')?.click();
    expect(granted).toBe(true);
    expect(region.querySelector('.result-video')).not.toBeNull();
    focusSpy.mockClear();

    renderResult(region, solution, 'solved', createConsent(granted, grantConsent));

    expect(region.querySelector('.youtube-load-button')).toBeNull();
    expect(region.querySelector('.youtube-privacy-notice')).toBeNull();
    expect(region.querySelector('.youtube-watch-link')).not.toBeNull();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('does not load a failed result even with session consent', () => {
    const region = document.createElement('section');

    renderResult(region, solution, 'failed', createConsent(true));

    expect(region.querySelector('.result-video')).toBeNull();
    expect(region.querySelector('.youtube-load-button')).toBeNull();
    expect(region.querySelector('.youtube-watch-link')).toBeNull();
  });

  it.each([undefined, 'not a URL'])(
    'handles an optional video URL of %s',
    (youtubeURL) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const region = document.createElement('section');

      renderResult(
        region,
        { ...solution, youtubeURL },
        'solved',
        createConsent(true),
      );

      expect(region.querySelector('.result-video')).toBeNull();
      expect(region.querySelector('.youtube-load-button')).toBeNull();
      expect(Boolean(region.querySelector('.result-video-unavailable'))).toBe(
        Boolean(youtubeURL),
      );
      expect(error).toHaveBeenCalledTimes(youtubeURL ? 1 : 0);
    },
  );

  it('clears and hides stale result content during play', () => {
    const region = document.createElement('section');
    region.dataset.outcome = 'solved';
    region.append(document.createElement('h3'));

    clearResult(region);

    expect(region.hidden).toBe(true);
    expect(region.dataset.outcome).toBeUndefined();
    expect(region.children).toHaveLength(0);
  });
});

describe('new result focus and scrolling', () => {
  afterEach(() => {
    delete (document.body as { scrollHeight?: number }).scrollHeight;
    delete (document.documentElement as { scrollHeight?: number }).scrollHeight;
  });

  it.each([
    [false, 'smooth'],
    [true, 'auto'],
  ] as const)(
    'uses %s reduced motion preference for %s scrolling',
    (reducedMotion, behavior) => {
      const region = document.createElement('section');
      const focusSpy = vi.spyOn(region, 'focus');
      const scrollToSpy = vi
        .spyOn(window, 'scrollTo')
        .mockImplementation(() => {});
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          callback(0);
          return 1;
        });

      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: reducedMotion,
      } as MediaQueryList);
      Object.defineProperty(document.body, 'scrollHeight', {
        value: 900,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        value: 1200,
        configurable: true,
      });

      focusCompletedResult(region);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(rafSpy).toHaveBeenCalledOnce();
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 1200, behavior });
    },
  );
});

describe('YouTube URL conversion', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=A_MjCqQoLLA',
      'A_MjCqQoLLA',
    ],
    [
      'https://youtube.com/watch?v=A-Mj_CqQo1',
      'A-Mj_CqQo1',
    ],
    [
      'https://youtu.be/A_MjCqQoLLA?t=42',
      'A_MjCqQoLLA',
    ],
    [
      'https://www.youtube.com/embed/A_MjCqQoLLA',
      'A_MjCqQoLLA',
    ],
    [
      'https://www.youtube-nocookie.com/embed/A_MjCqQoLLA',
      'A_MjCqQoLLA',
    ],
    [
      'https://youtube-nocookie.com/embed/A_MjCqQoLLA?start=30',
      'A_MjCqQoLLA',
    ],
  ])('supports %s', (url, videoId) => {
    expect(getYouTubeVideoUrls(url)).toEqual({
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  });

  it.each([
    'not a URL',
    'https://vimeo.com/A_MjCqQoLLA',
    'https://youtube.com.evil.invalid/watch?v=A_MjCqQoLLA',
    'https://youtube-nocookie.com.evil.invalid/embed/A_MjCqQoLLA',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/other?v=A_MjCqQoLLA',
    'https://youtu.be/',
    'https://youtu.be/A_MjCqQoLLA/extra',
    'ftp://youtu.be/A_MjCqQoLLA',
    'https://youtu.be/video.id',
    'https://www.youtube.com/embed/video%20id',
    'https://www.youtube.com/embed/A_MjCqQoLLA/extra',
    'https://www.youtube-nocookie.com/watch?v=A_MjCqQoLLA',
  ])('rejects %s', (url) => {
    expect(getYouTubeVideoUrls(url)).toBeNull();
  });
});

function createConsent(
  hasConsent: boolean,
  grantConsent: () => void = vi.fn(),
) {
  return { hasConsent, grantConsent };
}
