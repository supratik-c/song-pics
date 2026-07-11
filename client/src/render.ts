import {
  type GameElements,
  type GameState,
  type Puzzle,
} from './types.ts';

import {
  PUZZLE_DIRECTORY,
  TODAY_PUZZLE_ID,
} from './constants.ts';

import { resolvePublicPath } from './publicPath.ts';
import { isFuturePuzzleDateId, isPuzzleDateId } from './puzzleDates.ts';

const futurePuzzleMessage =
  'Still in development....';
const futurePuzzleImagePath =
  '/content/misc/double-semiquaver-orange.svg';

export async function renderPuzzle(
  elements: GameElements,
  puzzle: Puzzle,
): Promise<void> {
  setPlayableView(elements);

  elements.date.textContent = puzzle.displayDate;
  elements.title.textContent = puzzle.title;

  elements.panels.replaceChildren(
    ...puzzle.panels.map((panel) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');

      image.src = resolvePublicPath(panel.src);
      image.alt = `Panel from ${puzzle.title}`;

      figure.append(image);

      return figure;
    }),
  );

  await renderPuzzleDropdown(elements);
}

export function renderFuturePuzzle(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');
  const select =
    document.querySelector<HTMLSelectElement>('#puzzle-select');

  game?.classList.add('future-puzzle');
  select?.remove();

  elements.date.hidden = true;
  elements.title.hidden = true;
  elements.attemptsCount.hidden = true;
  elements.form.hidden = true;
  elements.message.hidden = true;
  elements.guessList.hidden = true;

  elements.date.textContent = '';
  elements.title.textContent = '';
  elements.attemptsCount.textContent = '';
  elements.message.textContent = '';
  elements.guessList.replaceChildren();

  const image = document.createElement('img');
  image.src = resolvePublicPath(futurePuzzleImagePath);
  image.alt = '';
  image.className = 'future-puzzle-image';

  const message = document.createElement('p');
  message.className = 'future-puzzle-message';
  message.textContent = futurePuzzleMessage;

  const homeButton = document.createElement('button');
  homeButton.className = 'future-puzzle-home';
  homeButton.type = 'button';
  homeButton.textContent = 'Back to home';
  homeButton.addEventListener('click', () => {
    const url = new URL(window.location.href);

    url.search = '';
    url.hash = '';
    window.location.href = url.toString();
  });

  elements.panels.setAttribute(
    'aria-label',
    'Future puzzle message',
  );
  elements.panels.replaceChildren(image, message, homeButton);
}

function setPlayableView(elements: GameElements): void {
  const game = elements.form.closest<HTMLElement>('.game');

  game?.classList.remove('future-puzzle');

  elements.date.hidden = false;
  elements.title.hidden = false;
  elements.attemptsCount.hidden = false;
  elements.form.hidden = false;
  elements.message.hidden = false;
  elements.guessList.hidden = false;

  elements.guessInput.disabled = false;
  elements.submitButton.disabled = false;
  elements.panels.setAttribute(
    'aria-label',
    'Storyboard clue panels',
  );
}

async function renderPuzzleDropdown(
  elements: GameElements,
): Promise<void> {
  const indexPath = resolvePublicPath(
    `${PUZZLE_DIRECTORY}/index.json`,
  );

  const response = await fetch(indexPath, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Could not load puzzle list: ${response.status} ${response.statusText}`,
    );
  }

  const result: unknown = await response.json();

  if (
    !Array.isArray(result) ||
    !result.every(
      (puzzleId) =>
        typeof puzzleId === 'string' && isPuzzleDateId(puzzleId),
    )
  ) {
    throw new Error('Puzzle index contains invalid data.');
  }

  const puzzleIds = result
    .filter((puzzleId) => !isFuturePuzzleDateId(puzzleId))
    .sort()
    .reverse();

  const requestedPuzzle =
    new URLSearchParams(window.location.search).get('puzzle');

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
    ...puzzleIds.map((puzzleId) => {
      const option = document.createElement('option');

      option.value = puzzleId;

      option.textContent =
        puzzleId === TODAY_PUZZLE_ID
          ? `${puzzleId} (TODAY)`
          : puzzleId;

      return option;
    }),
  );

  if (
    requestedPuzzle !== null &&
    puzzleIds.includes(requestedPuzzle)
  ) {
    select.value = requestedPuzzle;
  } else if (
    puzzleIds.includes(TODAY_PUZZLE_ID)
  ) {
    select.value = TODAY_PUZZLE_ID;
  }

  select.onchange = () => {
    const puzzleId = select.value;

    if (!puzzleIds.includes(puzzleId)) {
      return;
    }

    const url = new URL(window.location.href);

    if (puzzleId === TODAY_PUZZLE_ID) {
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
	console.log('YouTube value:', puzzle.YouTube);

	  if (puzzle.YouTube) {
		renderYouTubeVideo(elements, puzzle.YouTube);
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
      ? 'Make your first guess.'
      : 'Try again.';
}

function setFinished(
  elements: GameElements,
  message: string,
): void {
  elements.message.textContent = message;
  elements.guessInput.disabled = true;
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