import {
  type GameElements,
  type GameState,
  type Puzzle,
  type PuzzleArchive,
} from './types.ts';

import { resolvePublicPath } from './publicPath.ts';

const futurePuzzleMessage =
  'Still in development....';
const futurePuzzleImagePath =
  '/content/misc/double-semiquaver-orange.svg';
let closeExpandedPanel: (() => void) | null = null;

export function renderPuzzle(
  elements: GameElements,
  puzzle: Puzzle,
  archive: PuzzleArchive,
): void {
  closeExpandedPanel?.();
  setPlayableView(elements);

  elements.date.textContent = puzzle.displayDate;
  elements.title.textContent = puzzle.title;

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
      image.alt = `Panel from ${puzzle.title}`;

      zoomButton.append(image);
      figure.append(zoomButton);
      configurePanelZoom(
        figure,
        zoomButton,
        panelNumber,
      );

      return figure;
    }),
  );

  renderPuzzleDropdown(elements, archive);
}

export function renderFuturePuzzle(
  elements: GameElements,
  archive: PuzzleArchive,
): void {
  closeExpandedPanel?.();
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.add('future-puzzle');

  elements.date.hidden = true;
  elements.title.hidden = true;
  elements.artistHint.hidden = true;
  elements.attemptsCount.hidden = true;
  elements.form.hidden = true;
  elements.message.hidden = true;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = true;

  elements.date.textContent = '';
  elements.title.textContent = '';
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

  elements.panels.setAttribute(
    'aria-label',
    'Future puzzle message',
  );
  elements.panels.replaceChildren(image, message);
  renderPuzzleDropdown(elements, archive);
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
    button.setAttribute(
      'aria-label',
      `Enlarge clue panel ${panelNumber}`,
    );
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
      return;
    }

    open();
  });
}

function setPlayableView(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');

  elements.date.hidden = false;
  elements.title.hidden = false;
  elements.artistHint.hidden = true;
  elements.attemptsCount.hidden = false;
  elements.form.hidden = false;
  elements.message.hidden = false;
  elements.validationMessage.hidden = true;
  elements.guessList.hidden = false;

  elements.artistHint.textContent = '';
  elements.validationMessage.textContent = '';
  elements.guessInput.disabled = false;
  elements.revealArtistButton.disabled = false;
  elements.revealArtistButton.hidden = false;
  elements.submitButton.disabled = false;
  elements.panels.setAttribute(
    'aria-label',
    'Storyboard clue panels',
  );
}

function renderPuzzleDropdown(
  elements: GameElements,
  archive: PuzzleArchive,
): void {
  let select =
    document.querySelector<HTMLSelectElement>('#puzzle-select');

  if (!select) {
    select = document.createElement('select');
    select.id = 'puzzle-select';
    select.setAttribute('aria-label', 'Select puzzle');

    const archiveControl =
      document.querySelector<HTMLElement>('#archive-control');

    if (archiveControl) {
      archiveControl.append(select);
    } else {
      elements.attemptsCount.insertAdjacentElement(
        'afterend',
        select,
      );
    }
  }

  select.replaceChildren(
    ...archive.puzzleIds.map((puzzleId) => {
      const option = document.createElement('option');

      option.value = puzzleId;

      option.textContent =
        puzzleId === archive.latestPuzzleId
          ? `${puzzleId} (LATEST)`
          : puzzleId;

      return option;
    }),
  );

  select.value = archive.selectedPuzzleId;

  select.onchange = () => {
    const puzzleId = select.value;

    if (!archive.puzzleIds.includes(puzzleId)) {
      return;
    }

    const url = new URL(window.location.href);

    if (puzzleId === archive.latestPuzzleId) {
      url.searchParams.delete('puzzle');
    } else {
      url.searchParams.set('puzzle', puzzleId);
    }

    window.location.href = url.toString();
  };
}

export function renderState(
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
  maxAttempts: number,
): void {
  const attemptsLeft =
    maxAttempts - state.guesses.length;

  elements.attemptsCount.textContent =
    `${attemptsLeft} ${
      attemptsLeft === 1 ? 'guess' : 'guesses'
    } left`;

  elements.guessList.replaceChildren(
    ...state.guesses.map((guess) => {
      const item = document.createElement('li');

      item.textContent = guess;

      return item;
    }),
  );

  if (state.isSolved) {
    setFinished(
      elements,
      `Correct: ${puzzle.songTitle} by ${puzzle.artist}`,
    );

    if (puzzle.youtubeURL) {
      renderYouTubeVideo(elements, puzzle.youtubeURL);
    }

    return;
  }

  if (state.guesses.length >= maxAttempts) {
    setFinished(
      elements,
      `Out of guesses. It was ${puzzle.songTitle} by ${puzzle.artist}.`,
    );

    return;
  }

  elements.message.textContent =
    state.guesses.length === 0
      ? ''
      : 'Try again.';
}

function setFinished(
  elements: GameElements,
  message: string,
): void {
  elements.message.textContent = message;
  elements.guessInput.disabled = true;
  elements.revealArtistButton.disabled = true;
  elements.revealArtistButton.hidden = true;
  elements.submitButton.disabled = true;
}

function renderYouTubeVideo(
  elements: GameElements,
  youtubeUrl: string,
): void {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  if (!embedUrl) {
    console.error(`Invalid YouTube URL: ${youtubeUrl}`);
    return;
  }

  const existingVideo =
    document.querySelector<HTMLIFrameElement>('#youtube-video');

  if (existingVideo) {
    existingVideo.src = embedUrl;
    return;
  }

  const iframe = document.createElement('iframe');

  iframe.id = 'youtube-video';
  iframe.src = embedUrl;
  iframe.title = 'YouTube video';
  iframe.allow = 'web-share';
  iframe.allowFullscreen = true;

  elements.message.insertAdjacentElement('afterend', iframe);
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    let videoId: string | null = null;

    if (parsedUrl.hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.slice(1);
    } else if (
      parsedUrl.hostname === 'youtube.com' ||
      parsedUrl.hostname === 'www.youtube.com'
    ) {
      videoId = parsedUrl.searchParams.get('v');

      if (!videoId && parsedUrl.pathname.startsWith('/embed/')) {
        videoId = parsedUrl.pathname.split('/')[2] ?? null;
      }
    }

    if (!videoId) {
      return null;
    }

    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return null;
  }
}
