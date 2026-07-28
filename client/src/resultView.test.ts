import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameStatus, PuzzleSolution } from './types.ts';
import {
  clearResult,
  focusCompletedResult,
  getYouTubeEmbedUrl,
  renderResult,
} from './views/resultView.ts';

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  allow = '';
  allowFullscreen = false;
  className = '';
  focusOptions: FocusOptions | undefined;
  hidden = false;
  id = '';
  loading = '';
  src = '';
  textContent = '';
  title = '';

  constructor(readonly tagName = 'div') {}

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  focus(options?: FocusOptions): void {
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
    (status, title, message, hasVideo) => {
      stubDocument();
      const region = new FakeElement('section');
      region.hidden = true;

      renderResult(
        region as unknown as HTMLElement,
        solution,
        status,
      );

      expect(region.hidden).toBe(false);
      expect(region.dataset.outcome).toBe(status);
      expect(region.querySelector('.result-banner')?.textContent).toBe(title);
      expect(region.querySelector('.result-message')?.textContent).toBe(message);
      expect(region.querySelector('.result-answer')?.textContent).toBe(
        'Counting Stars by OneRepublic',
      );

      const video = region.querySelector('.result-video');

      expect(Boolean(video)).toBe(hasVideo);
      if (video) {
        expect(video.src).toBe(
          'https://www.youtube.com/embed/hT_nvWreIhg',
        );
        expect(video.title).toBe('Song video');
        expect(video.allowFullscreen).toBe(true);
        expect(video.loading).toBe('lazy');
      }
    },
  );

  it.each([undefined, 'not a URL'])(
    'omits the video when its URL is %s',
    (youtubeURL) => {
      stubDocument();
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const region = new FakeElement('section');

      renderResult(
        region as unknown as HTMLElement,
        { ...solution, youtubeURL },
        'solved',
      );

      expect(region.querySelector('.result-video')).toBeNull();
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
      'https://www.youtube.com/embed/A_MjCqQoLLA',
    ],
    [
      'https://youtube.com/watch?v=A-Mj_CqQo1',
      'https://www.youtube.com/embed/A-Mj_CqQo1',
    ],
    [
      'https://youtu.be/A_MjCqQoLLA?t=42',
      'https://www.youtube.com/embed/A_MjCqQoLLA',
    ],
    [
      'https://www.youtube.com/embed/A_MjCqQoLLA',
      'https://www.youtube.com/embed/A_MjCqQoLLA',
    ],
  ])('supports %s', (url, expected) => {
    expect(getYouTubeEmbedUrl(url)).toBe(expected);
  });

  it.each([
    'not a URL',
    'https://vimeo.com/A_MjCqQoLLA',
    'https://youtube.com.evil.invalid/watch?v=A_MjCqQoLLA',
    'https://www.youtube.com/watch',
    'https://youtu.be/',
    'https://youtu.be/A_MjCqQoLLA/extra',
    'ftp://youtu.be/A_MjCqQoLLA',
    'https://youtu.be/video.id',
    'https://www.youtube.com/embed/video%20id',
    'https://www.youtube.com/embed/A_MjCqQoLLA/extra',
  ])('rejects %s', (url) => {
    expect(getYouTubeEmbedUrl(url)).toBeNull();
  });
});

function stubDocument(): void {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => new FakeElement(tagName),
  });
}
