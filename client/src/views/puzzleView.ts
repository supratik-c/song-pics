import { getAttemptsLeft, type InvalidGuessReason } from '../domain/game.ts';
import type { GameRules } from '../domain/gameConfig.ts';
import type {
  GameState,
  GameStatus,
  PuzzleClue,
  PuzzleSolution,
} from '../domain/types.ts';
import { resolvePublicPath } from '../content/publicPath.ts';
import type { GameElements } from '../platform/dom.ts';
import { renderLoadingIndicator } from './loadingView.ts';
import { createPanelZoomController } from './panelZoom.ts';
import { clearResult } from './resultView.ts';

const futurePuzzleMessage = 'Still in development....';
const futurePuzzleImagePath =
  '/content/misc/double-semiquaver-orange.svg';
const lyricNote = '♪';
const lyricNoteSpacing = '  ';
const panelZoom = createPanelZoomController();

// Every full-screen state this view can show sets a value for each of
// these fields - 'unchanged' is an explicit choice, not an omission, so a
// new screen can't silently forget one. doodleCredit and resultRegion are
// handled separately: doodleCredit already has its own render function,
// and resultRegion also needs its content/dataset cleared, not just hidden.
type HiddenFieldName =
  | 'artistHint'
  | 'attemptsCount'
  | 'date'
  | 'form'
  | 'guessList'
  | 'message'
  | 'revealArtistButton'
  | 'shareRegion'
  | 'songClue'
  | 'validationMessage';

type HiddenFieldValue = boolean | 'unchanged';

type ScreenName = 'loading' | 'ready' | 'future' | 'load-error';

const SCREEN_HIDDEN_STATE: Record<
  ScreenName,
  Record<HiddenFieldName, HiddenFieldValue>
> = {
  loading: {
    artistHint: true,
    attemptsCount: false,
    date: false,
    form: false,
    guessList: true,
    message: true,
    revealArtistButton: false,
    shareRegion: true,
    songClue: false,
    validationMessage: true,
  },
  ready: {
    artistHint: 'unchanged',
    attemptsCount: 'unchanged',
    date: false,
    form: 'unchanged',
    guessList: false,
    message: false,
    revealArtistButton: 'unchanged',
    shareRegion: 'unchanged',
    songClue: false,
    validationMessage: true,
  },
  future: {
    artistHint: true,
    attemptsCount: true,
    date: true,
    form: true,
    guessList: true,
    message: true,
    revealArtistButton: 'unchanged',
    shareRegion: true,
    songClue: true,
    validationMessage: true,
  },
  'load-error': {
    artistHint: true,
    attemptsCount: true,
    // Deliberately 'unchanged': a load error can follow a normal render
    // (date/songClue visible) or a future-puzzle screen (already hidden),
    // and this path has never picked a value for them either way.
    date: 'unchanged',
    form: true,
    guessList: true,
    message: false,
    revealArtistButton: 'unchanged',
    shareRegion: true,
    songClue: 'unchanged',
    validationMessage: true,
  },
};

function applyScreenHiddenState(
  elements: GameElements,
  screen: ScreenName,
): void {
  const state = SCREEN_HIDDEN_STATE[screen];

  (Object.keys(state) as HiddenFieldName[]).forEach((field) => {
    const value = state[field];

    if (value !== 'unchanged') {
      elements[field].hidden = value;
    }
  });
}

export async function renderPuzzle(
  elements: GameElements,
  puzzle: PuzzleClue,
): Promise<void> {
  panelZoom.closeAny();
  setPuzzleLoadingView(elements);

  elements.date.textContent =
    `Issue #${puzzle.issueNumber} · ${puzzle.displayDate}`;
  elements.songClue.textContent = puzzle.songClue;
  renderDoodleCredit(elements.doodleCredit, puzzle.doodledBy);
  const renderedPanels = puzzle.panels.map((panel, index) => {
    const figure = document.createElement('figure');
    const zoomButton = document.createElement('button');
    const image = document.createElement('img');
    const panelNumber = index + 1;
    const ready = loadPanelImage(image, resolvePublicPath(panel.src));

    figure.className = 'panel';
    zoomButton.type = 'button';
    zoomButton.className = 'panel-zoom-button';
    zoomButton.setAttribute('aria-expanded', 'false');
    zoomButton.setAttribute(
      'aria-label',
      `Enlarge clue panel ${panelNumber}`,
    );
    image.alt = `Panel from ${puzzle.songClue}`;

    zoomButton.append(image);
    figure.append(zoomButton);
    panelZoom.configure(figure, zoomButton, panelNumber);
    return { figure, ready };
  });

  elements.panels.replaceChildren(
    ...renderedPanels.map(({ figure }) => figure),
    renderLoadingIndicator({ size: 'large' }),
  );

  await Promise.all(renderedPanels.map(({ ready }) => ready));

  elements.panels.replaceChildren(
    ...renderedPanels.map(({ figure }) => figure),
  );
  setPanelsReady(elements);
}

export function renderFuturePuzzle(elements: GameElements): void {
  panelZoom.closeAny();
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.add('future-puzzle');
  applyScreenHiddenState(elements, 'future');
  setFormUnavailable(elements, false);
  clearResult(elements.resultRegion);
  renderDoodleCredit(elements.doodleCredit, undefined);

  elements.date.textContent = '';
  elements.songClue.textContent = '';
  elements.artistHint.textContent = '';
  elements.attemptsCount.textContent = '';
  elements.message.textContent = '';
  elements.validationMessage.textContent = '';
  elements.guessList.replaceChildren();
  elements.panels.classList.remove('is-loading');
  elements.panels.removeAttribute('aria-busy');

  const image = document.createElement('img');
  image.src = resolvePublicPath(futurePuzzleImagePath);
  image.alt = '';
  image.className = 'future-puzzle-image';

  const message = document.createElement('p');
  message.className = 'future-puzzle-message';
  message.textContent = futurePuzzleMessage;

  elements.panels.setAttribute('aria-label', 'Future puzzle message');
  elements.panels.replaceChildren(image, message);
}

export function renderState(
  elements: GameElements,
  state: GameState,
  rules: GameRules,
  lyricLines: PuzzleSolution['lyricLines'],
): void {
  const attemptsLeft = getAttemptsLeft(state, rules);

  elements.shareRegion.hidden = state.status === 'playing';
  renderPanelLyrics(elements.panels, state.status, lyricLines);

  elements.attemptsCount.textContent =
    `${attemptsLeft} ${attemptsLeft === 1 ? 'guess' : 'guesses'} left`;
  elements.guessList.replaceChildren(
    ...state.guesses.map((guess) => {
      const item = document.createElement('li');
      item.textContent = guess;
      return item;
    }),
  );

  if (state.status !== 'playing') {
    setFinished(elements);
    return;
  }

  setPlayingForm(elements);
  elements.message.textContent =
    state.guesses.length === 0 ? '' : 'Try again.';
}

export function renderPanelLyrics(
  panelsElement: HTMLElement,
  status: GameStatus,
  lyricLines: PuzzleSolution['lyricLines'],
): void {
  const panels = panelsElement.querySelectorAll<HTMLElement>('.panel');

  panels.forEach((panel, index) => {
    panel.setAttribute('data-panel-number', String(index + 1));
    panel.querySelector('.panel-lyric')?.remove();
  });

  if (status === 'playing' || !lyricLines || lyricLines.length === 0) {
    return;
  }

  lyricLines.forEach((line, index) => {
    const panel = panels.item(index);

    if (!panel) {
      return;
    }

    panel.append(createLyricCaption(line));
  });
}

function createLyricCaption(line: string): HTMLElement {
  const caption = document.createElement('figcaption');
  const words = line.trim().split(/\s+/);

  caption.className = 'panel-lyric';
  caption.append(
    createLyricToken(lyricNote, 0),
    document.createTextNode(lyricNoteSpacing),
  );

  words.forEach((word, wordIndex) => {
    const tokenIndex = wordIndex + 1;
    const wordToken = createLyricToken(word, tokenIndex);
    const isLastWord = wordIndex === words.length - 1;

    if (!isLastWord) {
      caption.append(wordToken, document.createTextNode(' '));
      return;
    }

    const ending = document.createElement('span');
    ending.className = 'panel-lyric-ending';
    ending.append(
      wordToken,
      document.createTextNode(lyricNoteSpacing),
      createLyricToken(lyricNote, tokenIndex + 1),
    );
    caption.append(ending);
  });

  return caption;
}

function createLyricToken(text: string, index: number): HTMLElement {
  const token = document.createElement('span');

  token.className = 'panel-lyric-token';
  token.style.setProperty('--lyric-wave-token-index', String(index));
  token.textContent = text;

  return token;
}

export function renderDoodleCredit(
  creditElement: HTMLElement,
  doodledBy: PuzzleClue['doodledBy'],
): void {
  creditElement.textContent = doodledBy
    ? `Doodled By: ${doodledBy}`
    : '';
  creditElement.hidden = !doodledBy;
}

export function renderArtistHint(
  elements: GameElements,
  artist: string,
): void {
  elements.artistHint.textContent = `${artist}`;
  elements.artistHint.hidden = false;
  elements.revealArtistButton.hidden = true;
}

const revealArtistDefaultLabel = 'Reveal Artist';
const revealArtistUnavailableLabel = 'Not enough guesses!';

export function renderArtistReveal(
  elements: GameElements,
  state: GameState,
  rules: GameRules,
  artist: string,
): void {
  if (state.artistRevealed) {
    renderArtistHint(elements, artist);
    return;
  }

  elements.artistHint.hidden = true;
  elements.revealArtistButton.hidden = false;

  const canReveal = state.status === 'playing' &&
    getAttemptsLeft(state, rules) > rules.artistRevealCost;

  elements.revealArtistButton.disabled = !canReveal;

  const label = elements.revealArtistButton
    .querySelector<HTMLElement>('.reveal-artist-label');

  if (label) {
    label.textContent = canReveal
      ? revealArtistDefaultLabel
      : revealArtistUnavailableLabel;
  }
}

export function flashAttemptsPenalty(
  elements: GameElements,
  cost: number,
): void {
  elements.attemptsCell
    .querySelector('.attempts-penalty')
    ?.remove();

  const penalty = document.createElement('span');
  penalty.className = 'attempts-penalty';
  penalty.setAttribute('aria-hidden', 'true');
  penalty.textContent = `−${cost}`;
  elements.attemptsCell.append(penalty);

  window.setTimeout(() => {
    penalty.remove();
  }, 600);
}

export function renderGuessValidation(
  elements: GameElements,
  reason: InvalidGuessReason,
  rules: GameRules,
): void {
  const messages: Record<Exclude<InvalidGuessReason, 'not-playing'>, string> = {
    'too-long':
      `Your answer is too long. Please use ${rules.maxAnswerLength} characters or fewer.`,
    empty: 'Please enter an answer containing letters or numbers.',
    duplicate: 'You have already submitted that answer.',
  };

  if (reason === 'not-playing') {
    return;
  }

  elements.validationMessage.textContent = messages[reason];
  elements.validationMessage.hidden = false;
}

export function clearGuessValidation(elements: GameElements): void {
  elements.validationMessage.textContent = '';
  elements.validationMessage.hidden = true;
}

export function renderLoadError(elements: GameElements): void {
  panelZoom.closeAny();
  clearResult(elements.resultRegion);
  applyScreenHiddenState(elements, 'load-error');
  setFormUnavailable(elements, false);
  renderDoodleCredit(elements.doodleCredit, undefined);
  elements.panels.classList.remove('is-loading');
  elements.panels.removeAttribute('aria-busy');
  elements.panels.setAttribute('aria-label', 'Puzzle loading error');
  elements.panels.replaceChildren();
  elements.message.textContent =
    'The puzzle could not be loaded. Please refresh the page and try again.';
}

function loadPanelImage(
  image: HTMLImageElement,
  src: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanUp = (): void => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };

    const fail = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanUp();
      reject(new Error('A clue panel image could not be loaded.'));
    };

    const finish = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanUp();

      if (typeof image.decode !== 'function') {
        resolve();
        return;
      }

      void image.decode().then(resolve, () => {
        reject(new Error('A clue panel image could not be decoded.'));
      });
    };

    const handleLoad = (): void => {
      if (image.naturalWidth === 0) {
        fail();
        return;
      }

      finish();
    };

    const handleError = (): void => {
      fail();
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', handleError);
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth === 0) {
        fail();
      } else {
        finish();
      }
    }
  });
}

function setPanelsReady(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');
  applyScreenHiddenState(elements, 'ready');
  elements.panels.setAttribute('aria-label', 'Storyboard clue panels');
  elements.panels.classList.remove('is-loading');
  elements.panels.removeAttribute('aria-busy');
}

function setPuzzleLoadingView(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');
  applyScreenHiddenState(elements, 'loading');
  clearResult(elements.resultRegion);
  elements.artistHint.textContent = '';
  elements.attemptsCount.textContent = 'Guesses left';
  elements.validationMessage.textContent = '';
  setFormUnavailable(elements, false);
  elements.panels.classList.add('is-loading');
  elements.panels.setAttribute('aria-label', 'Loading clue panels');
  elements.panels.setAttribute('aria-busy', 'true');
}

function setFinished(elements: GameElements): void {
  elements.form.hidden = false;
  setFormUnavailable(elements, true);
  elements.message.textContent = '';
}

function setPlayingForm(elements: GameElements): void {
  elements.form.hidden = false;
  elements.form.classList.remove('is-layout-placeholder');
  elements.form.inert = false;
  elements.form.removeAttribute('aria-hidden');
  elements.guessInput.disabled = false;
  elements.revealArtistButton.disabled = false;
  elements.revealSongButton.disabled = false;
  elements.submitButton.disabled = false;
}

function setFormUnavailable(
  elements: GameElements,
  preserveLayout: boolean,
): void {
  elements.form.classList.toggle('is-layout-placeholder', preserveLayout);
  elements.form.inert = true;
  elements.form.setAttribute('aria-hidden', 'true');
  elements.guessInput.disabled = true;
  elements.revealArtistButton.disabled = true;
  elements.revealSongButton.disabled = true;
  elements.submitButton.disabled = true;
}
