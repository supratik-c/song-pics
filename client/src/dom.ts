import type { GameElements } from './types.ts';
export function getGameElements(): GameElements {
  return {
    artistHint: getElement<HTMLElement>('#artist-hint'),
    attemptsCount: getElement<HTMLElement>('#attempts-count'),
    date: getElement<HTMLElement>('#puzzle-date'),
    form: getElement<HTMLFormElement>('#guess-form'),
    guessInput: getElement<HTMLInputElement>('#guess-input'),
    guessList: getElement<HTMLOListElement>('#guess-list'),
    howToPlayButton: getElement<HTMLButtonElement>('#how-to-play-button'),
    message: getElement<HTMLElement>('#message'),
    modal: {
      dialog: getElement<HTMLDialogElement>('#game-dialog'),
      title: getElement<HTMLElement>('#game-dialog-title'),
      body: getElement<HTMLElement>('#game-dialog-body'),
      closeButton: getElement<HTMLButtonElement>('#game-dialog-close'),
    },
    panels: getElement<HTMLElement>('#panels'),
    previousIssuesButton: getElement<HTMLButtonElement>('#previous-issues-button'),
    revealArtistButton: getElement<HTMLButtonElement>('#reveal-artist-button'),
    revealSongButton: getElement<HTMLButtonElement>('#reveal-song-button'),
    submitButton: getElement<HTMLButtonElement>('#guess-form button[type="submit"]'),
    songClue: getElement<HTMLElement>('#puzzle-song-clue'),
    validationMessage: getElement<HTMLElement>('#validation-message'),
  };
}

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Missing element for selector: ${selector}`);
  }

  return element;
}
