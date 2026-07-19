export type PuzzlePanel = {
  src: string;
};

export type Puzzle = {
  id: string;
  displayDate: string;
  songClue: string;
  songTitle: string;
  artist: string;
  acceptedAnswers: string[];
  panels: PuzzlePanel[];
  youtubeURL?: string;
};

export type PuzzleJson = Omit<Puzzle, 'id' | 'displayDate' | 'panels'> & {
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
  howToPlayButton: HTMLButtonElement;
  message: HTMLElement;
  panels: HTMLElement;
  puzzleSelect: HTMLSelectElement;
  revealArtistButton: HTMLButtonElement;
  revealSongButton: HTMLButtonElement;
  submitButton: HTMLButtonElement;
  songClue: HTMLElement;
  validationMessage: HTMLElement;
};
