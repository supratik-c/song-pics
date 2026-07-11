import { MAX_ATTEMPTS, MAX_ANSWER_LENGTH } from './constants';

import { type GameElements } from './dom.ts';
import { isAcceptedAnswer, normalizeAnswer } from './game.ts';
import { loadPuzzle } from './puzzleLoader.ts';
import { renderPuzzle, renderState } from './render.ts';
import { loadState, saveState } from './storage.ts';
import { type GameState, type Puzzle } from './types.ts';


export async function initApp(elements: GameElements): Promise<void> {
  const puzzle = await loadPuzzle();
  const state = loadState(puzzle.id);

  renderPuzzle(elements, puzzle);
  renderState(elements, puzzle, state, MAX_ATTEMPTS);

  elements.form.addEventListener('submit', (event) => {
    handleGuess(event, elements, puzzle, state);
  });
}

function handleGuess(
  event: Event,
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
): void {
  event.preventDefault();

  const rawGuess = new FormData(elements.form).get('guess');

  let guess: string;

  try {
    guess = normalizeAnswer(String(rawGuess ?? ''));
  } catch (error) {
    if (error instanceof RangeError) {
      alert(
        `Your answer is too long. Please use ${MAX_ANSWER_LENGTH} characters or fewer.`,
      );
      return;
    }

    if (error instanceof Error && error.message === 'Answer is empty.') {
      alert('Please enter an answer containing letters or numbers.');
      return;
    }

    throw error;
  }

  if (state.isSolved || state.guesses.length >= MAX_ATTEMPTS) {
    return;
  }

  if (state.guesses.includes(guess)) {
    alert('You have already submitted that answer.');
    return;
  }

  state.guesses.push(guess);
  state.isSolved = isAcceptedAnswer(guess, puzzle.acceptedAnswers);

  saveState(puzzle.id, state);

  elements.form.reset();
  elements.guessInput.focus();

  renderState(elements, puzzle, state, MAX_ATTEMPTS);
}