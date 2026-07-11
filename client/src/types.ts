export type PuzzlePanel = {
  src: string;
  alt: string;
};

export type Puzzle = {
  id: string;
  displayDate: string;
  title: string;
  songTitle: string;
  artist: string;
  acceptedAnswers: string[];
  panels: PuzzlePanel[];
};


export type GameState = {
  guesses: string[];
  isSolved: boolean;
};

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