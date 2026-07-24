import type { GameElements } from '../dom.ts';
import type { InvalidGuessReason } from '../game.ts';
import type { GameRules } from '../gameConfig.ts';
import {
  getAdjacentPuzzleIds,
  type BuildPuzzleUrl,
} from '../navigation.ts';
import { resolvePublicPath } from '../publicPath.ts';
import type {
  GameState,
  GameStatus,
  PuzzleArchive,
  PuzzleClue,
} from '../types.ts';

const futurePuzzleMessage = 'Still in development....';
const futurePuzzleImagePath =
  '/content/misc/double-semiquaver-orange.svg';
let closeExpandedPanel: (() => void) | null = null;

export function renderPuzzle(
  elements: GameElements,
  puzzle: PuzzleClue,
  archive: PuzzleArchive,
  buildPuzzleUrl: BuildPuzzleUrl,
): void {
  closeExpandedPanel?.();
  setPlayableView(elements);

  elements.date.textContent =
    `Issue #${puzzle.issueNumber} - ${puzzle.displayDate}`;
  elements.songClue.textContent = puzzle.songClue;
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
  renderIssueNavigation(elements, archive, buildPuzzleUrl);

  elements.previousIssuesButton.disabled = archive.entries.length === 0;
}

export function renderFuturePuzzle(
  elements: GameElements,
  archive: PuzzleArchive,
): void {
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
  elements.issueNavigation.hidden = true;
  elements.shareRegion.hidden = true;

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
  elements.previousIssuesButton.disabled = archive.entries.length === 0;
}

export function renderState(
  elements: GameElements,
  state: GameState,
  rules: GameRules,
): void {
  const attemptsLeft = rules.maxAttempts - state.guesses.length;

  elements.shareRegion.hidden = state.status === 'playing';

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

export function renderArtistHint(
  elements: GameElements,
  artist: string,
): void {
  elements.artistHint.textContent = `Artist: ${artist}`;
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
    'artist-only':
      'Please enter the song title rather than only the artist.',
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
  elements.issueNavigation.hidden = true;
  elements.shareRegion.hidden = true;
  elements.message.textContent =
    'The puzzle could not be loaded. Please refresh the page and try again.';
}

function renderIssueNavigation(
  elements: GameElements,
  archive: PuzzleArchive,
  buildPuzzleUrl: BuildPuzzleUrl,
): void {
  const { previousPuzzleId, nextPuzzleId } = getAdjacentPuzzleIds(archive);

  configureIssueLink(
    elements.previousIssueLink,
    previousPuzzleId,
    archive.latestPuzzleId,
    buildPuzzleUrl,
  );
  configureIssueLink(
    elements.nextIssueLink,
    nextPuzzleId,
    archive.latestPuzzleId,
    buildPuzzleUrl,
  );
  elements.issueNavigation.hidden = false;
}

function configureIssueLink(
  link: HTMLAnchorElement,
  puzzleId: string | null,
  latestPuzzleId: string,
  buildPuzzleUrl: BuildPuzzleUrl,
): void {
  if (puzzleId === null) {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.tabIndex = -1;
    return;
  }

  link.href = buildPuzzleUrl(puzzleId, latestPuzzleId);
  link.removeAttribute('aria-disabled');
  link.removeAttribute('tabindex');
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
