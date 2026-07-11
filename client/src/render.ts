import {
  type GameElements,
  type GameState,
  type Puzzle,
} from './types.ts';

import {
  PUZZLE_DIRECTORY,
  TODAY_PUZZLE_PATH,
} from './constants.ts';

import { resolvePublicPath } from './publicPath.ts';

export async function renderPuzzle(
  elements: GameElements,
  puzzle: Puzzle,
): Promise<void> {
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
    !result.every((filename) => typeof filename === 'string')
  ) {
    throw new Error('Puzzle index contains invalid data.');
  }

  const puzzleFiles = result
    .filter(
      (filename) =>
        filename.endsWith('.json') &&
        filename !== 'index.json',
    )
    .sort()
    .reverse();

  const requestedPuzzle =
    new URLSearchParams(window.location.search).get('puzzle');

  const todayFilename =
    TODAY_PUZZLE_PATH.split('/').at(-1);

  let select =
    document.querySelector<HTMLSelectElement>('#puzzle-select');

  if (!select) {
    select = document.createElement('select');
    select.id = 'puzzle-select';
    select.setAttribute('aria-label', 'Select puzzle');

    elements.attemptsCount.insertAdjacentElement(
      'afterend',
      select,
    );
  }

  select.replaceChildren(
    ...puzzleFiles.map((filename) => {
      const option = document.createElement('option');
      const displayName = filename.replace(/\.json$/i, '');

      option.value = filename;

      option.textContent =
        filename === todayFilename
          ? `${displayName} (TODAY)`
          : displayName;

      return option;
    }),
  );

  if (
    requestedPuzzle !== null &&
    puzzleFiles.includes(requestedPuzzle)
  ) {
    select.value = requestedPuzzle;
  } else if (
    todayFilename !== undefined &&
    puzzleFiles.includes(todayFilename)
  ) {
    select.value = todayFilename;
  }

  select.onchange = () => {
    const filename = select.value;

    if (!puzzleFiles.includes(filename)) {
      return;
    }

    const url = new URL(window.location.href);

    if (filename === todayFilename) {
      url.searchParams.delete('puzzle');
    } else {
      url.searchParams.set('puzzle', filename);
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