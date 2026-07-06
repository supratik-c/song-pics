import { isAcceptedAnswer, normalizeAnswer} from './game.ts';
import { type Puzzle, GameState } from './types.ts';


const MAX_ATTEMPTS = 6;
const TODAY_PUZZLE_PATH = '/content/puzzles/2026-07-05.json';
const SHOULD_PERSIST_STATE = !import.meta.env.DEV;

const elements = {
  attemptsCount: getElement<HTMLElement>('#attempts-count'),
  date: getElement<HTMLElement>('#puzzle-date'),
  form: getElement<HTMLFormElement>('#guess-form'),
  guessInput: getElement<HTMLInputElement>('#guess-input'),
  guessList: getElement<HTMLOListElement>('#guess-list'),
  message: getElement<HTMLElement>('#message'),
  panels: getElement<HTMLElement>('#panels'),
  submitButton: getElement<HTMLButtonElement>('#guess-form button'),
  title: getElement<HTMLElement>('#puzzle-title'),
};

let puzzle: Puzzle;
let state: GameState;

async function init(): Promise<void> {
  puzzle = await loadPuzzle();
  state = loadState(puzzle.id);
  renderPuzzle(puzzle);
  renderState();

  elements.form.addEventListener('submit', handleGuess);
}

async function loadPuzzle(): Promise<Puzzle> {
  const response = await fetch(TODAY_PUZZLE_PATH);

  if (!response.ok) {
    throw new Error(`Could not load puzzle: ${response.status}`);
  }

  return (await response.json()) as Puzzle;
}

function loadState(puzzleId: string): GameState {
  const fallback: GameState = { guesses: [], isSolved: false };
  const key = storageKey(puzzleId);

  if (!SHOULD_PERSIST_STATE) {
    localStorage.removeItem(key);
    return fallback;
  }

  const stored = localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<GameState>;
    return {
      guesses: Array.isArray(parsed.guesses) ? parsed.guesses.filter((guess) => typeof guess === 'string') : [],
      isSolved: parsed.isSolved === true,
    };
  } catch {
    return fallback;
  }
}

function saveState(): void {
  if (!SHOULD_PERSIST_STATE) {
    return;
  }

  localStorage.setItem(storageKey(puzzle.id), JSON.stringify(state));
}

function storageKey(puzzleId: string): string {
  return `badly-drawn-bangers:${puzzleId}`;
}

function renderPuzzle(nextPuzzle: Puzzle): void {
  elements.date.textContent = nextPuzzle.displayDate;
  elements.title.textContent = nextPuzzle.title;
  elements.panels.replaceChildren(
    ...nextPuzzle.panels.map((panel, index) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');

      image.src = panel.src;
      image.alt = panel.alt;
      caption.textContent = `Panel ${index + 1}`;
      figure.append(image, caption);

      return figure;
    }),
  );
}

function renderState(): void {
  const attemptsLeft = MAX_ATTEMPTS - state.guesses.length;
  elements.attemptsCount.textContent = `${attemptsLeft} ${attemptsLeft === 1 ? 'guess' : 'guesses'} left`;

  elements.guessList.replaceChildren(
    ...state.guesses.map((guess) => {
      const item = document.createElement('li');
      item.textContent = guess;
      return item;
    }),
  );

  if (state.isSolved) {
    setFinished(`Correct: ${puzzle.songTitle} by ${puzzle.artist}`);
    return;
  }

  if (state.guesses.length >= MAX_ATTEMPTS) {
    setFinished(`Out of guesses. It was ${puzzle.songTitle} by ${puzzle.artist}.`);
    return;
  }

  elements.message.textContent = state.guesses.length === 0 ? 'Make your first guess.' : 'Try again.';
}

function setFinished(message: string): void {
  elements.message.textContent = message;
  elements.guessInput.disabled = true;
  elements.submitButton.disabled = true;
}

function handleGuess(event: Event): void {
  event.preventDefault();

  const rawGuess = new FormData(elements.form).get('guess');
  const guess = normalizeAnswer(String(rawGuess ?? ''));

  if (!guess || state.isSolved || state.guesses.length >= MAX_ATTEMPTS) {
    return;
  }

  state.guesses.push(guess);
  state.isSolved = isAcceptedAnswer(guess, puzzle.acceptedAnswers);
  saveState();
  elements.form.reset();
  elements.guessInput.focus();
  renderState();
}

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Missing element for selector: ${selector}`);
  }

  return element;
}

init().catch((error: unknown) => {
  elements.message.textContent = 'The puzzle could not be loaded. Run npm run dev from the web folder and try again.';
  console.error(error);
});