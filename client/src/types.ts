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
  youtubeURL?: string;
};

export type PuzzleJson = Omit<Puzzle, 'displayDate' | 'panels'> & {
  panels?: PuzzlePanel[];
};

export type PuzzlePanelsManifest = Record<string, PuzzlePanel[]>;

export type PuzzleArchive = {
  puzzleIds: string[];
  latestPuzzleId: string;
  selectedPuzzleId: string;
};

export type LoadedPuzzle = {
  puzzle: Puzzle;
  archive: PuzzleArchive;
};


export type GameState = {
  guesses: string[];
  isSolved: boolean;
};

export type GameElements = {
  artistHint: HTMLElement;
  attemptsCount: HTMLElement;
  date: HTMLElement;
  form: HTMLFormElement;
  guessInput: HTMLInputElement;
  guessList: HTMLOListElement;
  message: HTMLElement;
  panels: HTMLElement;
  revealArtistButton: HTMLButtonElement;
  submitButton: HTMLButtonElement;
  title: HTMLElement;
  validationMessage: HTMLElement;
};
