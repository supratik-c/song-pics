import { type GameState, type Puzzle, type GameElements } from './types.ts';
import { resolvePublicPath } from './publicPath.ts';

export function renderPuzzle(elements: GameElements, puzzle: Puzzle): void {
  elements.date.textContent = puzzle.displayDate;
  elements.title.textContent = puzzle.title;
  elements.panels.replaceChildren(
    ...puzzle.panels.map((panel, index) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');

      image.src = resolvePublicPath(panel.src);
      figure.append(image, caption);

      return figure;
    }),
  );
}

export function renderState(elements: GameElements, puzzle: Puzzle, state: GameState, maxAttempts: number): void {
  const attemptsLeft = maxAttempts - state.guesses.length;
  elements.attemptsCount.textContent = `${attemptsLeft} ${attemptsLeft === 1 ? 'guess' : 'guesses'} left`;

  elements.guessList.replaceChildren(
    ...state.guesses.map((guess) => {
      const item = document.createElement('li');
      item.textContent = guess;
      return item;
    }),
  );

  if (state.isSolved) {
    setFinished(elements, `Correct: ${puzzle.songTitle} by ${puzzle.artist}`);
    return;
  }

  if (state.guesses.length >= maxAttempts) {
    setFinished(elements, `Out of guesses. It was ${puzzle.songTitle} by ${puzzle.artist}.`);
    return;
  }

  elements.message.textContent = state.guesses.length === 0 ? 'Make your first guess.' : 'Try again.';
}

function setFinished(elements: GameElements, message: string): void {
  elements.message.textContent = message;
  elements.guessInput.disabled = true;
  elements.submitButton.disabled = true;
}