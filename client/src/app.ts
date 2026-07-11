import { type GameElements } from './dom.ts';
import { isAcceptedAnswer, normalizeAnswer } from './game.ts';
import { loadPuzzle } from './puzzleLoader.ts';
import { renderPuzzle, renderState } from './render.ts';
import { loadState, saveState } from './storage.ts';
import { type GameState, type Puzzle } from './types.ts';

const MAX_ATTEMPTS = 6;

export async function initApp(elements: GameElements): Promise<void> {
  const puzzle = await loadPuzzle();
  const state = loadState(puzzle.id);

  renderPuzzle(elements, puzzle);
  renderState(elements, puzzle, state, MAX_ATTEMPTS);

  elements.form.addEventListener('submit', (event) => {
    handleGuess(event, elements, puzzle, state);
  });
}

function handleGuess(event: Event, elements: GameElements, puzzle: Puzzle, state: GameState): void {
  event.preventDefault();

	const rawGuess = new FormData(elements.form).get('guess');
	let guess: string;

	try {
	  guess = normalizeAnswer(String(rawGuess ?? ''));
	} catch (error) {
	  if (error instanceof RangeError) {
		alert('Your answer is too long. Please use 128 characters or fewer.');
		return;
	  }

	  throw error;
	}

  if (!guess || state.isSolved || state.guesses.length >= MAX_ATTEMPTS) {
    return;
  }

  state.guesses.push(guess);
  state.isSolved = isAcceptedAnswer(guess, puzzle.acceptedAnswers);
  saveState(puzzle.id, state);
  elements.form.reset();
  elements.guessInput.focus();
  renderState(elements, puzzle, state, MAX_ATTEMPTS);
}