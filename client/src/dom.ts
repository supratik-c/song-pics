export type GameElements = {
  attemptsCount: HTMLElement;
  date: HTMLElement;
  form: HTMLFormElement;
  guessInput: HTMLInputElement;
  guessList: HTMLOListElement;
  message: HTMLElement;
  panels: HTMLElement;
  submitButton: HTMLButtonElement;
  title: HTMLElement;
};

export function getGameElements(): GameElements {
  return {
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
}

function getElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Missing element for selector: ${selector}`);
  }

  return element;
}