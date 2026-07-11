import {
  PUZZLE_DIRECTORY,
  TODAY_PUZZLE_PATH,
} from './constants.ts';

import { resolvePublicPath } from './publicPath.ts';
import { isFuturePuzzleDateId, isPuzzleDateId } from './puzzleDates.ts';
import { type Puzzle } from './types.ts';

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

  return await response.json() as Puzzle;
}