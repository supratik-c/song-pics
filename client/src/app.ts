import { MAX_ATTEMPTS, MAX_ANSWER_LENGTH } from './constants';

import { type GameElements } from './types.ts';
import { isAcceptedAnswer, normalizeAnswer } from './game.ts';
import { loadPuzzle } from './puzzleLoader.ts';
import { renderPuzzle, renderState } from './render.ts';
import { loadState, saveState } from './storage.ts';
import { type GameState, type Puzzle } from './types.ts';


export async function initApp(elements: GameElements): Promise<void> {
  const puzzle = await loadPuzzle();
  const state = loadState(puzzle.id);

  await renderPuzzle(elements, puzzle);
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
		alert(
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
		alert('Please enter the song title rather than only the artist.');
	  } else {
		alert('Please enter an answer containing letters or numbers.');
	  }

	  return;
	}
  if (state.isSolved || state.guesses.length >= MAX_ATTEMPTS) {
    return;
  }

  if (state.guesses.includes(guess)) {
    alert('You have already submitted that answer.');
    return;
  }

  state.guesses.push(guess);
  state.isSolved = isAcceptedAnswer(guess, puzzle.acceptedAnswers, puzzle.artist);

  saveState(puzzle.id, state);

  elements.form.reset();
  elements.guessInput.focus();

  renderState(elements, puzzle, state, MAX_ATTEMPTS);
}

function showArtistHint(
  elements: GameElements,
  artist: string,
): void {
  let artistHint =
    document.querySelector<HTMLParagraphElement>('#artist-hint');

  if (!artistHint) {
    artistHint = document.createElement('p');
    artistHint.id = 'artist-hint';
    artistHint.className = 'artist-hint';

    elements.message.insertAdjacentElement(
      'afterend',
      artistHint,
    );
  }

  artistHint.textContent = `Artist: ${artist}`;
}