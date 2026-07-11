import type { GameElements } from './types.ts';
export function getGameElements(): GameElements {
  return {
    artistHint: getElement<HTMLElement>('#artist-hint'),
    attemptsCount: getElement<HTMLElement>('#attempts-count'),
    date: getElement<HTMLElement>('#puzzle-date'),
    form: getElement<HTMLFormElement>('#guess-form'),
    guessInput: getElement<HTMLInputElement>('#guess-input'),
    guessList: getElement<HTMLOListElement>('#guess-list'),
    message: getElement<HTMLElement>('#message'),
    panels: getElement<HTMLElement>('#panels'),
    revealArtistButton: getElement<HTMLButtonElement>('#reveal-artist-button'),
    submitButton: getElement<HTMLButtonElement>('#guess-form button[type="submit"]'),
    title: getElement<HTMLElement>('#puzzle-title'),
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