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

export type GameStatus =
  | 'playing'
  | 'solved'
  | 'revealed'
  | 'failed';

export type GameState = {
  guesses: string[];
  status: GameStatus;
};

export type HowToPlaySection = {
  heading: string;
  body: string;
};

export type HowToPlayPanel = {
  src: string;
  alt: string;
};

export type HowToPlayManifest = {
  title: string;
  introduction: string;
  sections: HowToPlaySection[];
  demo: {
    clue: string;
    panels: HowToPlayPanel[];
    answer: string;
    artist: string;
  };
};

export type ModalElements = {
  dialog: HTMLDialogElement;
  title: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLButtonElement;
};

export type ModalTone = 'default' | 'success';

export type ModalView = {
  title: string;
  content: DocumentFragment;
  returnFocus: HTMLElement;
  onClose?: () => void;
  tone?: ModalTone;
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
  modal: ModalElements;
  panels: HTMLElement;
  previousIssuesButton: HTMLButtonElement;
  revealArtistButton: HTMLButtonElement;
  revealSongButton: HTMLButtonElement;
  submitButton: HTMLButtonElement;
  songClue: HTMLElement;
  validationMessage: HTMLElement;
};
