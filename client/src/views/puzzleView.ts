import type { GameElements } from '../dom.ts';
import type { InvalidGuessReason } from '../game.ts';
import type { GameRules } from '../gameConfig.ts';
import { resolvePublicPath } from '../publicPath.ts';
import type {
  GameState,
  GameStatus,
  PuzzleClue,
  PuzzleSolution,
} from '../types.ts';
import { renderLoadingIndicator } from './loadingView.ts';

const futurePuzzleMessage = 'Still in development....';
const futurePuzzleImagePath =
  '/content/misc/double-semiquaver-orange.svg';
const lyricNote = '♪';
const lyricNoteSpacing = '  ';
let closeExpandedPanel: (() => void) | null = null;

export async function renderPuzzle(
  elements: GameElements,
  puzzle: PuzzleClue,
): Promise<void> {
  closeExpandedPanel?.();
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
    configurePanelZoom(figure, zoomButton, panelNumber);
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
  closeExpandedPanel?.();
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.add('future-puzzle');
  elements.date.hidden = true;
  elements.songClue.hidden = true;
  elements.artistHint.hidden = true;
  elements.attemptsCount.hidden = true;
  elements.form.hidden = true;
  setFormUnavailable(elements, false);
  elements.message.hidden = true;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = true;
  hideResultRegion(elements);
  elements.shareRegion.hidden = true;
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
  const attemptsLeft = rules.maxAttempts - state.guesses.length;

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
  closeExpandedPanel?.();
  hideResultRegion(elements);
  elements.form.hidden = true;
  setFormUnavailable(elements, false);
  elements.artistHint.hidden = true;
  elements.attemptsCount.hidden = true;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = true;
  elements.shareRegion.hidden = true;
  renderDoodleCredit(elements.doodleCredit, undefined);
  elements.panels.classList.remove('is-loading');
  elements.panels.removeAttribute('aria-busy');
  elements.panels.setAttribute('aria-label', 'Puzzle loading error');
  elements.panels.replaceChildren();
  elements.message.hidden = false;
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

function configurePanelZoom(
  figure: HTMLElement,
  button: HTMLButtonElement,
  panelNumber: number,
): void {
  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    close();
    button.focus();
  };

  const close = (): void => {
    figure.classList.remove('is-expanded');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', `Enlarge clue panel ${panelNumber}`);
    document.body.classList.remove('panel-zoom-open');
    document.removeEventListener('keydown', handleEscape);

    if (closeExpandedPanel === close) {
      closeExpandedPanel = null;
    }
  };

  const open = (): void => {
    closeExpandedPanel?.();
    figure.classList.add('is-expanded');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute(
      'aria-label',
      `Return clue panel ${panelNumber} to normal size`,
    );
    document.body.classList.add('panel-zoom-open');
    document.addEventListener('keydown', handleEscape);
    closeExpandedPanel = close;
  };

  button.addEventListener('click', () => {
    if (figure.classList.contains('is-expanded')) {
      close();
    } else {
      open();
    }
  });
}

function setPanelsReady(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');
  elements.date.hidden = false;
  elements.songClue.hidden = false;
  elements.message.hidden = false;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = false;
  elements.panels.setAttribute('aria-label', 'Storyboard clue panels');
  elements.panels.classList.remove('is-loading');
  elements.panels.removeAttribute('aria-busy');
}

function setPuzzleLoadingView(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');
  elements.date.hidden = false;
  elements.songClue.hidden = false;
  elements.artistHint.hidden = true;
  elements.revealArtistButton.hidden = false;
  elements.attemptsCount.hidden = false;
  elements.form.hidden = false;
  elements.message.hidden = true;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = true;
  hideResultRegion(elements);
  elements.shareRegion.hidden = true;
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

function hideResultRegion(elements: GameElements): void {
  elements.resultRegion.hidden = true;
  delete elements.resultRegion.dataset.outcome;
  elements.resultRegion.replaceChildren();
}
