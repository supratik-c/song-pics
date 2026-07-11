import { MAX_ATTEMPTS, MAX_ANSWER_LENGTH } from './constants';

import {
  type GameElements,
  type GameState,
  type Puzzle,
  type PuzzleArchive,
} from './types.ts';
import { isAcceptedAnswer, normalizeAnswer } from './game.ts';
import { FuturePuzzleError, loadPuzzle } from './puzzleLoader.ts';
import { renderFuturePuzzle, renderPuzzle, renderState } from './render.ts';
import { loadState, saveState } from './storage.ts';

export async function initApp(elements: GameElements): Promise<void> {
  let puzzle: Puzzle;
  let archive: PuzzleArchive;

  try {
    ({ puzzle, archive } = await loadPuzzle());
  } catch (error) {
    if (error instanceof FuturePuzzleError) {
      renderFuturePuzzle(elements);
      return;
    }

    throw error;
  }

  const state = loadState(puzzle.id);

  renderPuzzle(elements, puzzle, archive);
  renderState(elements, puzzle, state, MAX_ATTEMPTS);

  elements.form.addEventListener('submit', (event) => {
    handleGuess(event, elements, puzzle, state);
  });

  elements.revealArtistButton.addEventListener('click', () => {
    showArtistHint(elements, puzzle.artist);
  });
}

function handleGuess(
  event: Event,
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
): void {
  event.preventDefault();
  hideValidationMessage(elements);

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

  if (state.isSolved || state.guesses.length >= MAX_ATTEMPTS) {
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
  state.isSolved = isAcceptedAnswer(
    guess,
    puzzle.acceptedAnswers,
    puzzle.artist,
  );

  saveState(puzzle.id, state);

  elements.form.reset();
  elements.guessInput.focus();

  renderState(elements, puzzle, state, MAX_ATTEMPTS);
}

function showArtistHint(
  elements: GameElements,
  artist: string,
): void {
  elements.artistHint.textContent = `Artist: ${artist}`;
  elements.artistHint.hidden = false;
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