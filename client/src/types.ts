export type PuzzlePanel = {
  src: string;
};

export type PuzzleClue = {
  id: string;
  displayDate: string;
  issueNumber: number;
  songClue: string;
  panels: PuzzlePanel[];
};

export type PuzzleSolution = {
  songTitle: string;
  artist: string;
  acceptedAnswers: string[];
  youtubeURL?: string;
};

export type Puzzle = PuzzleClue & PuzzleSolution;

export type PuzzleJson = Pick<PuzzleClue, 'songClue'> &
  PuzzleSolution & {
  panels?: PuzzlePanel[];
};

export type PuzzlePanelsManifest = Record<string, PuzzlePanel[]>;

export type PuzzleIndexEntry = {
  id: string;
  songClue: string;
};

export type PuzzleArchiveEntry = PuzzleIndexEntry & {
  issueNumber: number;
};

export type PuzzleArchive = {
  entries: PuzzleArchiveEntry[];
  latestPuzzleId: string;
  selectedPuzzleId: string;
};

export class FuturePuzzleError extends Error {
  constructor(
    public readonly puzzleId: string,
    public readonly archive: PuzzleArchive,
  ) {
    super(`Puzzle is not released yet: ${puzzleId}`);
    this.name = 'FuturePuzzleError';
  }
}

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
