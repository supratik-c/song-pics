import {
  PUZZLE_DIRECTORY,
  TODAY_PUZZLE_PATH,
} from './constants.ts';

import { resolvePublicPath } from './publicPath.ts';
import { isFuturePuzzleFilename } from './puzzleDates.ts';
import { type Puzzle } from './types.ts';

export class FuturePuzzleError extends Error {
  constructor(public readonly filename: string) {
    super(`Puzzle is not released yet: ${filename}`);
    this.name = 'FuturePuzzleError';
  }
}

export async function loadPuzzle(): Promise<Puzzle> {
  const requestedPuzzle =
    new URLSearchParams(window.location.search).get('puzzle');

  const isValidFilename =
    requestedPuzzle !== null &&
    /^[a-zA-Z0-9._-]+\.json$/.test(requestedPuzzle);

  if (
    isValidFilename &&
    isFuturePuzzleFilename(requestedPuzzle)
  ) {
    throw new FuturePuzzleError(requestedPuzzle);
  }

  const puzzlePath = isValidFilename
    ? `${PUZZLE_DIRECTORY}/${requestedPuzzle}`
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