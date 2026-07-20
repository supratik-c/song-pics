import { MAX_ATTEMPTS, MAX_ANSWER_LENGTH } from './constants';

import {
  type GameElements,
  type GameState,
  type Puzzle,
  type PuzzleArchive,
} from './types.ts';
import { isAcceptedAnswer, normalizeAnswer } from './game.ts';
import { loadHowToPlayManifest } from './howToPlayLoader.ts';
import {
  createModalController,
  type ModalController,
} from './modal.ts';
import { FuturePuzzleError, loadPuzzle } from './puzzleLoader.ts';
import {
  renderArchiveContent,
  renderFuturePuzzle,
  renderHowToPlayContent,
  renderModalMessage,
  renderPuzzle,
  renderResultContent,
  renderState,
} from './render.ts';
import { loadState, saveState } from './storage.ts';

export async function initApp(elements: GameElements): Promise<void> {
  let puzzle: Puzzle;
  let archive: PuzzleArchive;
  const modal = createModalController(elements.modal);

  elements.howToPlayButton.addEventListener('click', () => {
    void handleHowToPlay(elements, modal);
  });

  try {
    ({ puzzle, archive } = await loadPuzzle());
  } catch (error) {
    if (error instanceof FuturePuzzleError) {
      renderFuturePuzzle(elements, error.archive);
      bindArchiveButton(elements, error.archive, modal);
      return;
    }

    throw error;
  }

  const state = loadState(puzzle.id);

  renderPuzzle(elements, puzzle, archive);
  renderState(elements, puzzle, state, MAX_ATTEMPTS);
  bindArchiveButton(elements, archive, modal);

  elements.form.addEventListener('submit', (event) => {
    handleGuess(event, elements, puzzle, state, modal);
  });

  elements.revealArtistButton.addEventListener('click', () => {
    if (state.status === 'playing') {
      showArtistHint(elements, puzzle.artist);
    }
  });

  elements.revealSongButton.addEventListener('click', () => {
    handleRevealSong(elements, puzzle, state, modal);
  });
}

async function handleHowToPlay(
  elements: GameElements,
  modal: ModalController,
): Promise<void> {
  const viewId = modal.open({
    title: 'How to Play',
    content: renderModalMessage('Sharpening the crayons...'),
    returnFocus: elements.howToPlayButton,
  });

  try {
    const manifest = await loadHowToPlayManifest();

    modal.update(viewId, {
      title: manifest.title,
      content: renderHowToPlayContent(manifest),
    });
  } catch (error) {
    console.error(error);
    modal.update(viewId, {
      content: renderModalMessage(
        'The instructions have wandered off. Please close this box and try again.',
        'error',
      ),
    });
  }
}

function bindArchiveButton(
  elements: GameElements,
  archive: PuzzleArchive,
  modal: ModalController,
): void {
  elements.previousIssuesButton.addEventListener('click', () => {
    modal.open({
      title: 'Previous Issues',
      content: renderArchiveContent(archive),
      returnFocus: elements.previousIssuesButton,
    });
  });
}

function handleRevealSong(
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
  modal: ModalController,
): void {
  if (state.status === 'playing') {
    state.status = 'revealed';
    saveState(puzzle.id, state);
    hideValidationMessage(elements);
    renderState(elements, puzzle, state, MAX_ATTEMPTS);
  }

  openResultModal(elements, puzzle, state, modal);
}

function handleGuess(
  event: Event,
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
  modal: ModalController,
): void {
  event.preventDefault();
  hideValidationMessage(elements);

  if (state.status !== 'playing') {
    return;
  }

  const rawGuess = new FormData(elements.form).get('guess');

  let guess: string;
  let artistRemoved = false;

  try {
    const normalized = normalizeAnswer(
      String(rawGuess ?? ''),
      puzzle.artist,
    );

    guess = normalized.answer;
    artistRemoved = normalized.artistRemoved;
  } catch (error) {
    if (error instanceof RangeError) {
      showValidationMessage(
        elements,
        `Your answer is too long. Please use ${MAX_ANSWER_LENGTH} characters or fewer.`,
      );
      return;
    }

    throw error;
  }

  if (artistRemoved) {
    showArtistHint(elements, puzzle.artist);
  }

  if (guess.length === 0) {
    if (artistRemoved) {
      showValidationMessage(
        elements,
        'Please enter the song title rather than only the artist.',
      );
    } else {
      showValidationMessage(
        elements,
        'Please enter an answer containing letters or numbers.',
      );
    }

    return;
  }

  if (state.guesses.includes(guess)) {
    showValidationMessage(
      elements,
      'You have already submitted that answer.',
    );
    return;
  }

  state.guesses.push(guess);

  if (
    isAcceptedAnswer(
      guess,
      puzzle.acceptedAnswers,
      puzzle.artist,
    )
  ) {
    state.status = 'solved';
  } else if (state.guesses.length >= MAX_ATTEMPTS) {
    state.status = 'failed';
  }

  saveState(puzzle.id, state);

  elements.form.reset();
  renderState(elements, puzzle, state, MAX_ATTEMPTS);

  if (state.status === 'playing') {
    elements.guessInput.focus();
  } else {
    openResultModal(elements, puzzle, state, modal);
  }
}

function openResultModal(
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
  modal: ModalController,
): void {
  if (state.status === 'playing') {
    return;
  }

  const result = renderResultContent(puzzle, state.status);

  modal.open({
    title: result.title,
    content: result.content,
    returnFocus: elements.revealSongButton,
    onClose: result.onClose,
    tone: result.tone,
  });
}

function showArtistHint(
  elements: GameElements,
  artist: string,
): void {
  elements.artistHint.textContent = `Artist: ${artist}`;
  elements.artistHint.hidden = false;
  elements.revealArtistButton.hidden = true;
}

function showValidationMessage(
  elements: GameElements,
  message: string,
): void {
  elements.validationMessage.textContent = message;
  elements.validationMessage.hidden = false;
}

function hideValidationMessage(elements: GameElements): void {
  elements.validationMessage.textContent = '';
  elements.validationMessage.hidden = true;
}
