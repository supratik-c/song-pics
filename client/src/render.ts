import {
  type GameElements,
  type GameState,
  type GameStatus,
  type HowToPlayManifest,
  type Puzzle,
  type PuzzleArchive,
} from './types.ts';

import { resolveHowToPlayImagePath } from './howToPlayLoader.ts';
import { resolvePublicPath } from './publicPath.ts';
import { formatPuzzleDisplayDate } from './puzzleDates.ts';

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
      configurePanelZoom(
        figure,
        zoomButton,
        panelNumber,
      );

      return figure;
    }),
  );

  setArchiveAvailable(elements, archive);
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

  elements.panels.setAttribute(
    'aria-label',
    'Future puzzle message',
  );
  elements.panels.replaceChildren(image, message);
  setArchiveAvailable(elements, archive);
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
  elements.songClue.hidden = false;
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

function setArchiveAvailable(
  elements: GameElements,
  archive: PuzzleArchive,
): void {
  elements.previousIssuesButton.disabled =
    archive.puzzleIds.length === 0;
}

export function renderModalMessage(
  message: string,
  kind: 'loading' | 'error' = 'loading',
): DocumentFragment {
  const content = document.createDocumentFragment();
  const paragraph = document.createElement('p');

  paragraph.className = `dialog-message dialog-message-${kind}`;
  paragraph.textContent = message;
  content.append(paragraph);

  return content;
}

export function renderHowToPlayContent(
  manifest: HowToPlayManifest,
): DocumentFragment {
  const content = document.createDocumentFragment();
  const introduction = document.createElement('p');
  const instructions = document.createElement('div');
  const demo = document.createElement('section');
  const demoHeading = document.createElement('h3');
  const demoClue = document.createElement('p');
  const panels = document.createElement('div');
  const answer = document.createElement('p');

  introduction.className = 'how-to-introduction';
  introduction.textContent = manifest.introduction;

  instructions.className = 'how-to-sections';
  instructions.append(
    ...manifest.sections.map((section, index) => {
      const instruction = document.createElement('section');
      const heading = document.createElement('h3');
      const body = document.createElement('p');

      instruction.className = 'how-to-section';
      heading.textContent = `${index + 1}. ${section.heading}`;
      body.textContent = section.body;
      instruction.append(heading, body);

      return instruction;
    }),
  );

  demo.className = 'how-to-demo';
  demoHeading.textContent = 'A tiny example';
  demoClue.className = 'how-to-demo-clue';
  demoClue.textContent = manifest.demo.clue;
  panels.className = 'how-to-demo-panels';
  panels.append(
    ...manifest.demo.panels.map((panel) => {
      const image = document.createElement('img');

      image.src = resolveHowToPlayImagePath(panel.src);
      image.alt = panel.alt;
      image.width = 800;
      image.height = 600;

      return image;
    }),
  );
  answer.className = 'how-to-demo-answer';
  answer.textContent =
    `Answer: ${manifest.demo.answer} by ${manifest.demo.artist}`;
  demo.append(demoHeading, demoClue, panels, answer);

  content.append(introduction, instructions, demo);
  return content;
}

export function renderArchiveContent(
  archive: PuzzleArchive,
): DocumentFragment {
  const pageSize = 5;
  const content = document.createDocumentFragment();
  const archiveView = document.createElement('div');
  const list = document.createElement('ol');
  const pagination = document.createElement('nav');
  const previousButton = document.createElement('button');
  const pageStatus = document.createElement('p');
  const nextButton = document.createElement('button');
  const selectedIndex = Math.max(
    archive.puzzleIds.indexOf(archive.selectedPuzzleId),
    0,
  );
  const pageCount = Math.max(
    Math.ceil(archive.puzzleIds.length / pageSize),
    1,
  );
  let currentPage = Math.floor(selectedIndex / pageSize);

  archiveView.className = 'archive-view';
  list.className = 'archive-list';
  pagination.className = 'archive-pagination';
  pagination.setAttribute('aria-label', 'Archive pages');

  previousButton.type = 'button';
  previousButton.className =
    'dialog-action-button tactile-button';
  previousButton.textContent = 'Previous';

  pageStatus.className = 'archive-page-status';
  pageStatus.setAttribute('aria-live', 'polite');

  nextButton.type = 'button';
  nextButton.className =
    'dialog-action-button tactile-button';
  nextButton.textContent = 'Next';

  const renderPage = (): void => {
    const startIndex = currentPage * pageSize;
    const pagePuzzleIds = archive.puzzleIds.slice(
      startIndex,
      startIndex + pageSize,
    );

    list.replaceChildren(
      ...pagePuzzleIds.map((puzzleId) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        const date = document.createElement('span');
        const badges = document.createElement('span');

        item.className = 'archive-list-item';
        link.className = 'archive-link';
        link.href = getPuzzleUrl(
          puzzleId,
          archive.latestPuzzleId,
        );
        date.textContent = formatPuzzleDisplayDate(puzzleId);
        badges.className = 'archive-badges';

        if (puzzleId === archive.selectedPuzzleId) {
          const currentBadge = document.createElement('span');

          currentBadge.textContent = 'Current';
          currentBadge.className = 'archive-badge';
          badges.append(currentBadge);
          link.setAttribute('aria-current', 'page');
        }

        if (puzzleId === archive.latestPuzzleId) {
          const latestBadge = document.createElement('span');

          latestBadge.textContent = 'Latest';
          latestBadge.className =
            'archive-badge archive-badge-latest';
          badges.append(latestBadge);
        }

        link.append(date, badges);
        item.append(link);
        return item;
      }),
    );

    pageStatus.textContent =
      `Page ${currentPage + 1} of ${pageCount}`;
    previousButton.disabled = currentPage === 0;
    nextButton.disabled = currentPage === pageCount - 1;
    list.scrollTop = 0;
  };

  previousButton.addEventListener('click', () => {
    if (currentPage === 0) {
      return;
    }

    currentPage -= 1;
    renderPage();
  });
  nextButton.addEventListener('click', () => {
    if (currentPage === pageCount - 1) {
      return;
    }

    currentPage += 1;
    renderPage();
  });

  pagination.append(previousButton, pageStatus, nextButton);
  archiveView.append(list, pagination);
  content.append(archiveView);
  renderPage();

  return content;
}

type RenderedResult = {
  title: string;
  content: DocumentFragment;
  onClose?: () => void;
  tone: 'default' | 'success';
};

export function renderResultContent(
  puzzle: Puzzle,
  status: Exclude<GameStatus, 'playing'>,
): RenderedResult {
  const content = document.createDocumentFragment();
  const message = document.createElement('p');
  const answer = document.createElement('p');
  let title: string;
  const tone = status === 'solved' ? 'success' : 'default';

  message.className = 'result-message';
  answer.className = 'result-answer';
  answer.textContent = `${puzzle.songTitle} by ${puzzle.artist}`;

  if (status === 'solved') {
    title = 'Correct!';
    message.textContent = 'You decoded the doodles.';
  } else if (status === 'revealed') {
    title = 'Song Revealed';
    message.textContent =
      'The scribbles win this round. The song was:';
  } else {
    title = 'Out of Guesses';
    message.textContent =
      'That was your last guess. The song was:';
  }

  content.append(message, answer);

  if (status !== 'failed' && puzzle.youtubeURL) {
    const video = createYouTubeVideo(puzzle.youtubeURL);

    if (video) {
      content.append(video);
      return {
        title,
        content,
        tone,
        onClose: () => {
          video.src = 'about:blank';
        },
      };
    }
  }

  return { title, content, tone };
}

function getPuzzleUrl(
  puzzleId: string,
  latestPuzzleId: string,
): string {
  const url = new URL(window.location.href);

  if (puzzleId === latestPuzzleId) {
    url.searchParams.delete('puzzle');
  } else {
    url.searchParams.set('puzzle', puzzleId);
  }

  return url.toString();
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

  if (state.status !== 'playing') {
    setFinished(elements, state.status);
    return;
  }

  setRevealSongButtonLabel(elements, 'Reveal Song');
  elements.message.textContent =
    state.guesses.length === 0
      ? ''
      : 'Try again.';
}

function setRevealSongButtonLabel(
  elements: GameElements,
  label: string,
): void {
  const labelElement =
    elements.revealSongButton.querySelector('span');

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

function createYouTubeVideo(
  youtubeUrl: string,
): HTMLIFrameElement | null {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  if (!embedUrl) {
    console.error(`Invalid YouTube URL: ${youtubeUrl}`);
    return null;
  }

  const iframe = document.createElement('iframe');

  iframe.className = 'result-video';
  iframe.src = embedUrl;
  iframe.title = 'Song video';
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';

  return iframe;
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
