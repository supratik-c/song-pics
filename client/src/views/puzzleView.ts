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

const futurePuzzleMessage = 'Still in development....';
const futurePuzzleImagePath =
  '/content/misc/double-semiquaver-orange.svg';
const lyricNote = '♪';
const lyricNoteSpacing = '  ';
let closeExpandedPanel: (() => void) | null = null;

export function renderPuzzle(
  elements: GameElements,
  puzzle: PuzzleClue,
): void {
  closeExpandedPanel?.();
  setPlayableView(elements);

  elements.date.textContent =
    `Issue #${puzzle.issueNumber} · ${puzzle.displayDate}`;
  elements.songClue.textContent = puzzle.songClue;
  renderDoodleCredit(elements.doodleCredit, puzzle.doodledBy);
  elements.panels.replaceChildren(
    ...puzzle.panels.map((panel, index) => {
      const figure = document.createElement('figure');
      const zoomButton = document.createElement('button');
      const image = document.createElement('img');
      const panelNumber = index + 1;

      figure.className = 'panel';
      zoomButton.type = 'button';
      zoomButton.className = 'panel-zoom-button';
      zoomButton.setAttribute('aria-expanded', 'false');
      zoomButton.setAttribute(
        'aria-label',
        `Enlarge clue panel ${panelNumber}`,
      );
      image.src = resolvePublicPath(panel.src);
      image.alt = `Panel from ${puzzle.songClue}`;

      zoomButton.append(image);
      figure.append(zoomButton);
      configurePanelZoom(figure, zoomButton, panelNumber);
      return figure;
    }),
  );
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
  elements.message.hidden = true;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = true;
  elements.shareRegion.hidden = true;
  renderDoodleCredit(elements.doodleCredit, undefined);

  elements.date.textContent = '';
  elements.songClue.textContent = '';
  elements.artistHint.textContent = '';
  elements.attemptsCount.textContent = '';
  elements.message.textContent = '';
  elements.validationMessage.textContent = '';
  elements.guessList.replaceChildren();

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
    setFinished(elements, state.status);
    return;
  }

  setRevealSongButtonLabel(elements, 'Reveal Song');
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
  elements.shareRegion.hidden = true;
  renderDoodleCredit(elements.doodleCredit, undefined);
  elements.message.textContent =
    'The puzzle could not be loaded. Please refresh the page and try again.';
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

function setPlayableView(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');
  elements.date.hidden = false;
  elements.songClue.hidden = false;
  elements.artistHint.hidden = true;
  elements.attemptsCount.hidden = false;
  elements.form.hidden = false;
  elements.message.hidden = false;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = false;
  elements.shareRegion.hidden = true;

  elements.artistHint.textContent = '';
  elements.validationMessage.textContent = '';
  elements.guessInput.disabled = false;
  elements.revealArtistButton.disabled = false;
  elements.revealArtistButton.hidden = false;
  elements.submitButton.disabled = false;
  elements.panels.setAttribute('aria-label', 'Storyboard clue panels');
}

function setRevealSongButtonLabel(
  elements: GameElements,
  label: string,
): void {
  const labelElement = elements.revealSongButton.querySelector('span');

  if (labelElement) {
    labelElement.textContent = label;
  } else {
    elements.revealSongButton.textContent = label;
  }
}

function setFinished(
  elements: GameElements,
  status: Exclude<GameStatus, 'playing'>,
): void {
  elements.message.textContent = '';
  elements.guessInput.disabled = true;
  elements.revealArtistButton.disabled = true;
  elements.revealArtistButton.hidden = true;
  elements.submitButton.disabled = true;
  elements.revealSongButton.disabled = false;
  setRevealSongButtonLabel(elements, 'View Result');

  if (status === 'solved') {
    elements.attemptsCount.textContent = 'Solved!';
  } else if (status === 'revealed') {
    elements.attemptsCount.textContent = 'Song revealed';
  } else {
    elements.attemptsCount.textContent = 'Out of guesses';
  }
}
