import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameStatus, PuzzleSolution } from './types.ts';
import {
  clearResult,
  focusCompletedResult,
  getYouTubeVideoUrls,
  renderResult,
} from './views/resultView.ts';

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  readonly listeners = new Map<string, Array<() => void>>();
  allow = '';
  allowFullscreen = false;
  className = '';
  focusCalled = false;
  focusOptions: FocusOptions | undefined;
  hidden = false;
  href = '';
  id = '';
  loading = '';
  referrerPolicy = '';
  rel = '';
  src = '';
  target = '';
  textContent = '';
  title = '';
  type = '';

  constructor(readonly tagName = 'div') {}

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? [];

    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click(): void {
    this.listeners.get('click')?.forEach((listener) => listener());
  }

  focus(options?: FocusOptions): void {
    this.focusCalled = true;
    this.focusOptions = options;
  }

  querySelector(selector: string): FakeElement | null {
    for (const child of this.children) {
      if (
        selector.startsWith('.') &&
        child.className.split(' ').includes(selector.slice(1))
      ) {
        return child;
      }

      if (!selector.startsWith('.') && child.tagName === selector) {
        return child;
      }

      const descendant = child.querySelector(selector);

      if (descendant) {
        return descendant;
      }
    }

    return null;
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }
}

const solution: PuzzleSolution = {
  songTitle: 'Counting Stars',
  artist: 'OneRepublic',
  acceptedAnswers: ['Counting Stars'],
  youtubeURL: 'https://www.youtube.com/watch?v=hT_nvWreIhg',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
      stubDocument();
      const region = new FakeElement('section');
      region.hidden = true;

      renderResult(
        region as unknown as HTMLElement,
        solution,
        status,
        createConsent(false),
      );

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
          loadButton.children[0]?.attributes['aria-hidden'],
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
    stubDocument();
    const region = new FakeElement('section');
    const grantConsent = vi.fn();

    renderResult(
      region as unknown as HTMLElement,
      solution,
      'solved',
      createConsent(false, grantConsent),
    );

    const loadButton = region.querySelector('.youtube-load-button');

    expect(loadButton).not.toBeNull();
    loadButton?.click();

    const video = region.querySelector('.result-video');
    const watchLink = region.querySelector('.youtube-watch-link');

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
    expect(video?.focusCalled).toBe(true);
    expect(watchLink?.href).toBe(
      'https://www.youtube.com/watch?v=hT_nvWreIhg',
    );
    expect(watchLink?.children[0]?.attributes['aria-hidden']).toBe('true');
    expect(watchLink?.children[1]?.textContent).toBe('Watch on YouTube');

    loadButton?.click();
    expect(region.querySelector('.result-video')).toBe(video);
  });

  it('automatically loads a rerendered result after consent without moving focus', () => {
    stubDocument();
    const region = new FakeElement('section');
    let granted = false;
    const grantConsent = (): void => {
      granted = true;
    };

    renderResult(
      region as unknown as HTMLElement,
      solution,
      'solved',
      createConsent(false, grantConsent),
    );
    region.querySelector('.youtube-load-button')?.click();
    expect(granted).toBe(true);
    expect(region.querySelector('.result-video')).not.toBeNull();

    renderResult(
      region as unknown as HTMLElement,
      solution,
      'solved',
      createConsent(granted, grantConsent),
    );

    expect(region.querySelector('.youtube-load-button')).toBeNull();
    expect(region.querySelector('.youtube-privacy-notice')).toBeNull();
    expect(region.querySelector('.youtube-watch-link')).not.toBeNull();
    expect(region.querySelector('.result-video')?.focusCalled).toBe(false);
  });

  it('does not load a failed result even with session consent', () => {
    stubDocument();
    const region = new FakeElement('section');

    renderResult(
      region as unknown as HTMLElement,
      solution,
      'failed',
      createConsent(true),
    );

    expect(region.querySelector('.result-video')).toBeNull();
    expect(region.querySelector('.youtube-load-button')).toBeNull();
    expect(region.querySelector('.youtube-watch-link')).toBeNull();
  });

  it.each([undefined, 'not a URL'])(
    'handles an optional video URL of %s',
    (youtubeURL) => {
      stubDocument();
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const region = new FakeElement('section');

      renderResult(
        region as unknown as HTMLElement,
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
    const region = new FakeElement('section');
    region.dataset.outcome = 'solved';
    region.append(new FakeElement('h3'));

    clearResult(region as unknown as HTMLElement);

    expect(region.hidden).toBe(true);
    expect(region.dataset.outcome).toBeUndefined();
    expect(region.children).toHaveLength(0);
  });
});

describe('new result focus and scrolling', () => {
  it.each([
    [false, 'smooth'],
    [true, 'auto'],
  ] as const)(
    'uses %s reduced motion preference for %s scrolling',
    (reducedMotion, behavior) => {
      const region = new FakeElement('section');
      const scrollTo = vi.fn();
      const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

      vi.stubGlobal('document', {
        body: { scrollHeight: 900 },
        documentElement: { scrollHeight: 1200 },
      });
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: reducedMotion }),
        requestAnimationFrame,
        scrollTo,
      });

      focusCompletedResult(region as unknown as HTMLElement);

      expect(region.focusOptions).toEqual({ preventScroll: true });
      expect(requestAnimationFrame).toHaveBeenCalledOnce();
      expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior });
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

function stubDocument(): void {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => new FakeElement(tagName),
  });
}

function createConsent(
  hasConsent: boolean,
  grantConsent: () => void = vi.fn(),
) {
  return { hasConsent, grantConsent };
}
