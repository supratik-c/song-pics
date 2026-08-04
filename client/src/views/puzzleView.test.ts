import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME_RULES } from '../domain/gameConfig.ts';
import type { GameStatus, PuzzleClue } from '../domain/types.ts';
import type { GameElements } from '../platform/dom.ts';
import {
  renderDoodleCredit,
  renderFuturePuzzle,
  renderLoadError,
  renderPanelLyrics,
  renderPuzzle,
  renderState,
} from './puzzleView.ts';

// Captured before any spying happens in this file, so image stubbing below
// can still create real elements without recursing into its own spy.
const originalCreateElement = document.createElement.bind(document);

const puzzle: PuzzleClue = {
  id: '2026-07-31',
  displayDate: '31 Jul 26',
  issueNumber: 2,
  songClue: 'A clue without spoilers',
  panels: [
    { src: '/content/puzzles/2026-07-31/1.webp' },
    { src: '/content/puzzles/2026-07-31/2.webp' },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('panel lyric rendering', () => {
  it('keeps lyric text out of the DOM while play is active', () => {
    const panels = createPanelsContainer(2);

    renderPanelLyrics(panels, 'playing', ['First line', 'Second line']);

    expect(panels.querySelectorAll('.panel-lyric')).toHaveLength(0);
  });

  it.each<GameStatus>(['solved', 'revealed', 'failed'])(
    'renders independent ordered word waves for %s games',
    (status) => {
      const panels = createPanelsContainer(2);

      renderPanelLyrics(panels, status, ['First line', 'Second line']);

      const captions = Array.from(panels.querySelectorAll('.panel-lyric'));
      const firstTokens = Array.from(
        captions[0].querySelectorAll('.panel-lyric-token'),
      );
      const secondTokens = Array.from(
        captions[1].querySelectorAll('.panel-lyric-token'),
      );
      const firstEnding = captions[0].querySelector('.panel-lyric-ending');

      expect(captions).toHaveLength(2);
      expect(panels.children[0].getAttribute('data-panel-number')).toBe('1');
      expect(panels.children[1].getAttribute('data-panel-number')).toBe('2');
      expect(firstTokens.map((token) => token.textContent)).toEqual([
        '♪',
        'First',
        'line',
        '♪',
      ]);
      expect(secondTokens.map((token) => token.textContent)).toEqual([
        '♪',
        'Second',
        'line',
        '♪',
      ]);
      expect(tokenIndexes(firstTokens)).toEqual(['0', '1', '2', '3']);
      expect(tokenIndexes(secondTokens)).toEqual(['0', '1', '2', '3']);
      expect(
        Array.from(
          firstEnding?.querySelectorAll('.panel-lyric-token') ?? [],
        ).map((token) => token.textContent),
      ).toEqual(['line', '♪']);
    },
  );

  it('keeps a single lyric word and trailing note in one ending group', () => {
    const panels = createPanelsContainer(1);

    renderPanelLyrics(panels, 'solved', [
      'Supercalifragilisticexpialidocious',
    ]);

    const caption = panels.querySelector('.panel-lyric');
    const ending = caption?.querySelector('.panel-lyric-ending');
    const endingTokens = Array.from(
      ending?.querySelectorAll('.panel-lyric-token') ?? [],
    );

    expect(endingTokens.map((token) => token.textContent)).toEqual([
      'Supercalifragilisticexpialidocious',
      '♪',
    ]);
    expect(tokenIndexes(endingTokens)).toEqual(['1', '2']);
    // The double space is two U+00A0 non-breaking spaces (lyricNoteSpacing
    // in puzzleView.ts), not two regular spaces — spelled out explicitly so
    // it survives editing without silently reverting to U+0020.
    expect(caption?.textContent).toBe(
      '♪  Supercalifragilisticexpialidocious  ♪',
    );
  });

  it('collapses authored whitespace and keeps punctuation with words', () => {
    const panels = createPanelsContainer(1);

    renderPanelLyrics(panels, 'solved', ["  Don't   stop,   now!  "]);

    const caption = panels.querySelector('.panel-lyric');
    const tokens = Array.from(
      caption?.querySelectorAll('.panel-lyric-token') ?? [],
    );

    expect(tokens.map((token) => token.textContent)).toEqual([
      '♪',
      "Don't",
      'stop,',
      'now!',
      '♪',
    ]);
    expect(caption?.textContent).toBe(
      "♪  Don't stop, now!  ♪",
    );
  });

  it.each([undefined, []])(
    'renders no captions when lyric lines are %s',
    (lyricLines) => {
      const panels = createPanelsContainer(2);

      renderPanelLyrics(panels, 'solved', lyricLines);

      expect(panels.querySelectorAll('.panel-lyric')).toHaveLength(0);
    },
  );

  it('replaces existing captions instead of duplicating them', () => {
    const panels = createPanelsContainer(1);

    renderPanelLyrics(panels, 'solved', ['First line']);
    renderPanelLyrics(panels, 'failed', ['Updated line']);

    const captions = Array.from(panels.querySelectorAll('.panel-lyric'));
    const tokens = Array.from(
      captions[0].querySelectorAll('.panel-lyric-token'),
    );

    expect(captions).toHaveLength(1);
    expect(tokens.map((token) => token.textContent)).toEqual([
      '♪',
      'Updated',
      'line',
      '♪',
    ]);
  });
});

describe('doodler credit rendering', () => {
  it('renders the configured credit with the agreed wording', () => {
    const credit = document.createElement('p');

    renderDoodleCredit(credit, 'purblevibes');

    expect(credit.textContent).toBe('Doodled By: purblevibes');
    expect(credit.hidden).toBe(false);
  });

  it('clears and hides the credit when it is omitted', () => {
    const credit = document.createElement('p');
    credit.textContent = 'Doodled By: previous artist';

    renderDoodleCredit(credit, undefined);

    expect(credit.textContent).toBe('');
    expect(credit.hidden).toBe(true);
  });
});

describe('playing and terminal form rendering', () => {
  it('keeps the interactive form available only while play continues', () => {
    const elements = createGameElements();
    const {
      form,
      guessInput,
      revealArtistButton,
      revealSongButton,
      shareRegion,
      submitButton,
    } = elements;

    form.hidden = true;
    form.inert = true;
    form.setAttribute('aria-hidden', 'true');
    guessInput.disabled = true;
    revealArtistButton.disabled = true;
    submitButton.disabled = true;
    revealSongButton.disabled = true;

    renderState(
      elements,
      { guesses: ['first guess'], status: 'playing' },
      GAME_RULES,
      undefined,
    );

    expect(form.hidden).toBe(false);
    expect(form.inert).toBe(false);
    expect(form.hasAttribute('aria-hidden')).toBe(false);
    expect(form.classList.contains('is-layout-placeholder')).toBe(false);
    expect(guessInput.disabled).toBe(false);
    expect(revealArtistButton.disabled).toBe(false);
    expect(submitButton.disabled).toBe(false);
    expect(revealSongButton.disabled).toBe(false);
    expect(shareRegion.hidden).toBe(true);
    expect(elements.attemptsCount.textContent).toBe('4 guesses left');
    expect(elements.message.textContent).toBe('Try again.');
  });

  it.each<Exclude<GameStatus, 'playing'>>([
    'solved',
    'revealed',
    'failed',
  ])('keeps an inert form placeholder behind the %s result', (status) => {
    const elements = createGameElements();
    const {
      form,
      guessInput,
      revealArtistButton,
      revealSongButton,
      shareRegion,
      submitButton,
    } = elements;

    revealSongButton.textContent = 'Reveal Song';

    renderState(
      elements,
      { guesses: ['first guess'], status },
      GAME_RULES,
      undefined,
    );

    expect(form.hidden).toBe(false);
    expect(form.inert).toBe(true);
    expect(form.getAttribute('aria-hidden')).toBe('true');
    expect(form.classList.contains('is-layout-placeholder')).toBe(true);
    expect(shareRegion.hidden).toBe(false);
    expect(guessInput.disabled).toBe(true);
    expect(revealArtistButton.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
    expect(revealSongButton.disabled).toBe(true);
    expect(revealSongButton.textContent).toBe('Reveal Song');
    expect(elements.message.textContent).toBe('');
  });
});

describe('puzzle panel loading', () => {
  it('keeps all panels hidden behind the loader until every image decodes', async () => {
    const images = [createControllableImage(), createControllableImage()];
    const decodeSpies = images.map((image) =>
      vi.spyOn(image, 'decode').mockResolvedValue(undefined),
    );
    const elements = createGameElements();

    stubImageCreation(images);
    const rendering = renderPuzzle(elements, puzzle);

    expect(elements.form.hidden).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.guessInput.disabled).toBe(true);
    expect(elements.revealArtistButton.disabled).toBe(true);
    expect(elements.revealSongButton.disabled).toBe(true);
    expect(elements.submitButton.disabled).toBe(true);
    expect(elements.panels.getAttribute('aria-busy')).toBe('true');
    expect(elements.panels.classList.contains('is-loading')).toBe(true);
    expect(
      elements.panels.querySelectorAll('.loading-indicator'),
    ).toHaveLength(1);

    finishLoading(images[0]);
    await Promise.resolve();
    await Promise.resolve();

    expect(
      elements.panels.querySelectorAll('.loading-indicator'),
    ).toHaveLength(1);
    expect(elements.form.hidden).toBe(false);

    finishLoading(images[1]);
    await rendering;

    expect(decodeSpies[0]).toHaveBeenCalledOnce();
    expect(decodeSpies[1]).toHaveBeenCalledOnce();
    expect(elements.panels.querySelectorAll('.panel')).toHaveLength(2);
    expect(
      elements.panels.querySelectorAll('.loading-indicator'),
    ).toHaveLength(0);
    expect(elements.panels.hasAttribute('aria-busy')).toBe(false);
    expect(elements.panels.classList.contains('is-loading')).toBe(false);
    expect(elements.form.hidden).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.submitButton.disabled).toBe(true);
  });

  it('reveals cached images after decoding them', async () => {
    const images = [
      createControllableImage({ complete: true, naturalWidth: 800 }),
      createControllableImage({ complete: true, naturalWidth: 800 }),
    ];
    const decodeSpies = images.map((image) =>
      vi.spyOn(image, 'decode').mockResolvedValue(undefined),
    );
    const elements = createGameElements();

    stubImageCreation(images);
    await renderPuzzle(elements, puzzle);

    expect(decodeSpies.every((spy) => spy.mock.calls.length === 1)).toBe(
      true,
    );
    expect(elements.panels.hasAttribute('aria-busy')).toBe(false);
    expect(elements.form.hidden).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.submitButton.disabled).toBe(true);
  });

  it('rejects an image request failure and clears loading in the error view', async () => {
    const images = [createControllableImage(), createControllableImage()];
    const elements = createGameElements();

    elements.form.classList.add('is-layout-placeholder');
    stubImageCreation(images);
    const rendering = renderPuzzle(elements, puzzle);
    failLoading(images[0]);

    await expect(rendering).rejects.toThrow(
      'A clue panel image could not be loaded.',
    );

    renderLoadError(elements);

    expect(
      elements.panels.querySelectorAll('.loading-indicator'),
    ).toHaveLength(0);
    expect(elements.panels.hasAttribute('aria-busy')).toBe(false);
    expect(elements.form.hidden).toBe(true);
    expect(elements.form.classList.contains('is-layout-placeholder')).toBe(
      false,
    );
    expect(elements.form.inert).toBe(true);
    expect(elements.message.hidden).toBe(false);
  });

  it('rejects when a loaded image cannot be decoded', async () => {
    const images = [createControllableImage(), createControllableImage()];

    vi.spyOn(images[0], 'decode').mockRejectedValue(new Error('bad image'));

    const elements = createGameElements();

    stubImageCreation(images);
    const rendering = renderPuzzle(elements, puzzle);
    finishLoading(images[0]);

    await expect(rendering).rejects.toThrow(
      'A clue panel image could not be decoded.',
    );
  });

  it('removes the interaction reservation for a future puzzle', () => {
    const elements = createGameElements();

    elements.form.classList.add('is-layout-placeholder');
    stubImageCreation([]);
    renderFuturePuzzle(elements);

    expect(elements.form.hidden).toBe(true);
    expect(elements.form.classList.contains('is-layout-placeholder')).toBe(
      false,
    );
    expect(elements.form.inert).toBe(true);
  });
});

// Characterizes every hidden-bearing field for the two full-screen states,
// including the fields each one deliberately leaves untouched. This is the
// baseline a later refactor of puzzleView.ts's screen-state handling must
// reproduce (or change on purpose, updating this test to match).
describe('full-screen state coverage', () => {
  it('renderFuturePuzzle hides every guess-flow region', () => {
    const elements = createGameElements();

    stubImageCreation([]);
    renderFuturePuzzle(elements);

    expect(hiddenFlags(elements)).toEqual({
      artistHint: true,
      attemptsCount: true,
      date: true,
      doodleCredit: true,
      form: true,
      guessList: true,
      message: true,
      panels: false,
      resultRegion: true,
      revealArtistButton: false,
      shareRegion: true,
      songClue: true,
      validationMessage: true,
    });
  });

  it('renderLoadError leaves the date and song clue exactly as they were', () => {
    const elements = createGameElements();

    renderLoadError(elements);

    // Unlike renderFuturePuzzle, this path never touches date/songClue —
    // whatever visibility they had before a mid-render failure carries
    // through unchanged. `message` is also shown here, not hidden, since
    // it now holds the error text.
    expect(hiddenFlags(elements)).toEqual({
      artistHint: true,
      attemptsCount: true,
      date: false,
      doodleCredit: true,
      form: true,
      guessList: true,
      message: false,
      panels: false,
      resultRegion: true,
      revealArtistButton: false,
      shareRegion: true,
      songClue: false,
      validationMessage: true,
    });
  });

  it('setPuzzleLoadingView (via renderPuzzle) shows the reveal-artist button and hides the rest', async () => {
    const elements = createGameElements();

    stubImageCreation([]);
    const rendering = renderPuzzle(elements, puzzleWithoutPanels());

    expect(hiddenFlags(elements)).toEqual({
      artistHint: true,
      attemptsCount: false,
      date: false,
      // No doodledBy on this fixture, so renderDoodleCredit hides it —
      // same as every other test puzzle in this file.
      doodleCredit: true,
      form: false,
      guessList: true,
      message: true,
      panels: false,
      resultRegion: true,
      revealArtistButton: false,
      shareRegion: true,
      songClue: false,
      validationMessage: true,
    });

    await rendering;
  });

  it('setPanelsReady (via renderPuzzle) leaves the reveal-artist visibility from the loading state untouched', async () => {
    const elements = createGameElements();

    stubImageCreation([]);
    await renderPuzzle(elements, puzzleWithoutPanels());

    // Only the fields renderPuzzle's loading phase actually promised to
    // revisit on completion are re-checked here; the rest carry over from
    // setPuzzleLoadingView and are covered by the test above.
    expect(elements.date.hidden).toBe(false);
    expect(elements.songClue.hidden).toBe(false);
    expect(elements.message.hidden).toBe(false);
    expect(elements.validationMessage.hidden).toBe(true);
    expect(elements.guessList.hidden).toBe(false);
    expect(elements.revealArtistButton.hidden).toBe(false);
  });
});

function puzzleWithoutPanels(): PuzzleClue {
  return { ...puzzle, panels: [] };
}

function hiddenFlags(
  elements: GameElements,
): Record<string, boolean | 'until-found'> {
  return {
    artistHint: elements.artistHint.hidden,
    attemptsCount: elements.attemptsCount.hidden,
    date: elements.date.hidden,
    doodleCredit: elements.doodleCredit.hidden,
    form: elements.form.hidden,
    guessList: elements.guessList.hidden,
    message: elements.message.hidden,
    panels: elements.panels.hidden,
    resultRegion: elements.resultRegion.hidden,
    revealArtistButton: elements.revealArtistButton.hidden,
    shareRegion: elements.shareRegion.hidden,
    songClue: elements.songClue.hidden,
    validationMessage: elements.validationMessage.hidden,
  };
}

function createPanelsContainer(count: number): HTMLElement {
  const container = document.createElement('div');

  for (let index = 0; index < count; index += 1) {
    const panel = document.createElement('figure');

    panel.className = 'panel';
    container.append(panel);
  }

  return container;
}

function createGameElements(): GameElements {
  // Nested beneath a `.game`-classed ancestor so `elements.form.closest`
  // resolves the same way it does inside the real page shell.
  const game = document.createElement('section');
  const form = document.createElement('form') as HTMLFormElement;

  game.className = 'game';
  game.append(form);

  return {
    artistHint: document.createElement('p'),
    attemptsCount: document.createElement('p'),
    date: document.createElement('p'),
    doodleCredit: document.createElement('p'),
    form,
    guessInput: document.createElement('input') as HTMLInputElement,
    guessList: document.createElement('ol') as HTMLOListElement,
    howToPlayButton: document.createElement('button') as HTMLButtonElement,
    message: document.createElement('p'),
    modal: {
      dialog: document.createElement('dialog') as HTMLDialogElement,
      title: document.createElement('h2'),
      body: document.createElement('div'),
      closeButton: document.createElement('button') as HTMLButtonElement,
    },
    panels: document.createElement('div'),
    allReleasesButton: document.createElement('button') as HTMLButtonElement,
    revealArtistButton: document.createElement(
      'button',
    ) as HTMLButtonElement,
    revealSongButton: document.createElement('button') as HTMLButtonElement,
    resultRegion: document.createElement('section'),
    shareRegion: document.createElement('div'),
    submitButton: document.createElement('button') as HTMLButtonElement,
    songClue: document.createElement('h2'),
    validationMessage: document.createElement('p'),
  };
}

function tokenIndexes(tokens: Element[]): string[] {
  return tokens.map((token) =>
    (token as HTMLElement).style.getPropertyValue(
      '--lyric-wave-token-index',
    ),
  );
}

// Real <img> elements attempt a network fetch when `src` is assigned in
// happy-dom. Panel loading is exercised here by driving `load`/`error`
// events directly instead, so the setter is shadowed to a no-op and
// `complete`/`naturalWidth` are controlled explicitly per test.
function createControllableImage({
  complete = false,
  naturalWidth = 0,
}: { complete?: boolean; naturalWidth?: number } = {}): HTMLImageElement {
  const image = originalCreateElement('img') as HTMLImageElement;

  Object.defineProperty(image, 'src', {
    configurable: true,
    get: () => '',
    set: () => {},
  });
  Object.defineProperty(image, 'complete', {
    value: complete,
    configurable: true,
  });
  Object.defineProperty(image, 'naturalWidth', {
    value: naturalWidth,
    configurable: true,
  });

  return image;
}

function finishLoading(image: HTMLImageElement): void {
  Object.defineProperty(image, 'complete', {
    value: true,
    configurable: true,
  });
  Object.defineProperty(image, 'naturalWidth', {
    value: 800,
    configurable: true,
  });
  image.dispatchEvent(new Event('load'));
}

function failLoading(image: HTMLImageElement): void {
  Object.defineProperty(image, 'complete', {
    value: true,
    configurable: true,
  });
  image.dispatchEvent(new Event('error'));
}

function stubImageCreation(images: HTMLImageElement[]): void {
  const queue = [...images];

  vi.spyOn(document, 'createElement').mockImplementation(((
    tagName: string,
  ) => {
    if (tagName !== 'img') {
      return originalCreateElement(tagName);
    }

    return (
      queue.shift() ?? createControllableImage({ complete: true, naturalWidth: 800 })
    );
  }) as typeof document.createElement);
}
