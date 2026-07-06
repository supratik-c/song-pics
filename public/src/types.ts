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