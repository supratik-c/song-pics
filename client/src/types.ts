export type PuzzlePanel = {
  src: string;
};

export type Puzzle = {
  id: string;
  displayDate: string;
  title: string;
  songTitle: string;
  artist: string;
  acceptedAnswers: string[];
  panels: PuzzlePanel[];
  YouTube?: string;
};

export type PuzzleJson = Omit<Puzzle, 'displayDate' | 'panels'> & {
  panels?: PuzzlePanel[];
};

export type PuzzlePanelsManifest = Record<string, PuzzlePanel[]>;


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
