import type { ModalElements } from './modal.ts';

export type GameElements = {
  artistHint: HTMLElement;
  attemptsCount: HTMLElement;
  date: HTMLElement;
  form: HTMLFormElement;
  guessInput: HTMLInputElement;
  guessList: HTMLOListElement;
  howToPlayButton: HTMLButtonElement;
  issueNavigation: HTMLElement;
  message: HTMLElement;
  modal: ModalElements;
  nextIssueLink: HTMLAnchorElement;
  panels: HTMLElement;
  previousIssueLink: HTMLAnchorElement;
  previousIssuesButton: HTMLButtonElement;
  revealArtistButton: HTMLButtonElement;
  revealSongButton: HTMLButtonElement;
  shareRegion: HTMLElement;
  submitButton: HTMLButtonElement;
  songClue: HTMLElement;
  validationMessage: HTMLElement;
};

export function getGameElements(): GameElements {
  return {
    artistHint: getElement<HTMLElement>('#artist-hint'),
    attemptsCount: getElement<HTMLElement>('#attempts-count'),
    date: getElement<HTMLElement>('#puzzle-date'),
    form: getElement<HTMLFormElement>('#guess-form'),
    guessInput: getElement<HTMLInputElement>('#guess-input'),
    guessList: getElement<HTMLOListElement>('#guess-list'),
    howToPlayButton: getElement<HTMLButtonElement>('#how-to-play-button'),
    issueNavigation: getElement<HTMLElement>('#issue-navigation'),
    message: getElement<HTMLElement>('#message'),
    modal: {
      dialog: getElement<HTMLDialogElement>('#game-dialog'),
      title: getElement<HTMLElement>('#game-dialog-title'),
      body: getElement<HTMLElement>('#game-dialog-body'),
      closeButton: getElement<HTMLButtonElement>('#game-dialog-close'),
    },
    nextIssueLink: getElement<HTMLAnchorElement>('#next-issue-link'),
    panels: getElement<HTMLElement>('#panels'),
    previousIssueLink: getElement<HTMLAnchorElement>('#previous-issue-link'),
    previousIssuesButton: getElement<HTMLButtonElement>('#previous-issues-button'),
    revealArtistButton: getElement<HTMLButtonElement>('#reveal-artist-button'),
    revealSongButton: getElement<HTMLButtonElement>('#reveal-song-button'),
    shareRegion: getElement<HTMLElement>('#share-region'),
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
