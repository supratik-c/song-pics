import {
  PUZZLE_DIRECTORY,
  PUZZLE_PANELS_PATH,
  TODAY_PUZZLE_PATH,
} from './constants.ts';

import { resolvePublicPath } from './publicPath.ts';
import {
  formatPuzzleDisplayDate,
  isFuturePuzzleDateId,
  isPuzzleDateId,
} from './puzzleDates.ts';
import {
  type Puzzle,
  type PuzzleJson,
  type PuzzlePanelsManifest,
} from './types.ts';

export class FuturePuzzleError extends Error {
  constructor(public readonly puzzleId: string) {
    super(`Puzzle is not released yet: ${puzzleId}`);
    this.name = 'FuturePuzzleError';
  }
}

export async function loadPuzzle(): Promise<Puzzle> {
  const requestedPuzzle =
    new URLSearchParams(window.location.search).get('puzzle');

  const isValidPuzzleId =
    requestedPuzzle !== null &&
    isPuzzleDateId(requestedPuzzle);

  if (
    isValidPuzzleId &&
    isFuturePuzzleDateId(requestedPuzzle)
  ) {
    throw new FuturePuzzleError(requestedPuzzle);
  }

  const puzzlePath = isValidPuzzleId
    ? `${PUZZLE_DIRECTORY}/${requestedPuzzle}/puzzle.json`
    : TODAY_PUZZLE_PATH;

  const response = await fetch(resolvePublicPath(puzzlePath), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Could not load puzzle: ${response.status} ${response.statusText}`,
    );
  }

  const puzzle = await response.json() as PuzzleJson;
  const panels = puzzle.panels ?? await loadPuzzlePanels(puzzle.id);

  return {
    ...puzzle,
    displayDate: formatPuzzleDisplayDate(puzzle.id),
    panels,
  };
}

async function loadPuzzlePanels(puzzleId: string): Promise<Puzzle['panels']> {
  const response = await fetch(resolvePublicPath(PUZZLE_PANELS_PATH), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Could not load puzzle panels: ${response.status} ${response.statusText}`,
    );
  }

  const manifest = await response.json() as PuzzlePanelsManifest;
  const panels = manifest[puzzleId];

  if (!panels || panels.length === 0) {
    throw new Error(`Puzzle has no generated panels: ${puzzleId}`);
  }

  return panels;
}