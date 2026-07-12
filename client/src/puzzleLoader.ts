import {
  PUZZLE_DIRECTORY,
  PUZZLE_FILE_NAME,
  PUZZLE_INDEX_PATH,
  PUZZLE_PANELS_PATH,
} from './constants.ts';

import { resolvePublicPath } from './publicPath.ts';
import {
  formatPuzzleDisplayDate,
  isFuturePuzzleDateId,
  isPuzzleDateId,
} from './puzzleDates.ts';
import {
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchive,
  type PuzzleJson,
  type PuzzlePanelsManifest,
} from './types.ts';

export class FuturePuzzleError extends Error {
  constructor(
    public readonly puzzleId: string,
    public readonly archive: PuzzleArchive,
  ) {
    super(`Puzzle is not released yet: ${puzzleId}`);
    this.name = 'FuturePuzzleError';
  }
}

export async function loadPuzzle(): Promise<LoadedPuzzle> {
  const requestedPuzzle = getRequestedPuzzleId();
  const puzzleIds = await loadReleasedPuzzleIds();

  const isValidPuzzleId =
    requestedPuzzle !== null &&
    isPuzzleDateId(requestedPuzzle);

  if (
    isValidPuzzleId &&
    isFuturePuzzleDateId(requestedPuzzle)
  ) {
    throw new FuturePuzzleError(requestedPuzzle, {
      puzzleIds,
      latestPuzzleId: puzzleIds[0],
      selectedPuzzleId: requestedPuzzle,
    });
  }

  const selectedPuzzleId = resolveSelectedPuzzleId(
    requestedPuzzle,
    puzzleIds,
  );
  const puzzle = await loadPuzzleJson(selectedPuzzleId);

  return {
    puzzle,
    archive: {
      puzzleIds,
      latestPuzzleId: puzzleIds[0],
      selectedPuzzleId,
    },
  };
}

async function loadReleasedPuzzleIds(): Promise<string[]> {
  const response = await fetch(resolvePublicPath(PUZZLE_INDEX_PATH), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Could not load puzzle list: ${response.status} ${response.statusText}`,
    );
  }

  const result: unknown = await response.json();

  if (
    !Array.isArray(result) ||
    !result.every(
      (puzzleId) =>
        typeof puzzleId === 'string' && isPuzzleDateId(puzzleId),
    )
  ) {
    throw new Error('Puzzle index contains invalid data.');
  }

  const puzzleIds = result
    .filter((puzzleId) => !isFuturePuzzleDateId(puzzleId))
    .sort()
    .reverse();

  if (puzzleIds.length === 0) {
    throw new Error('Puzzle index contains no released puzzles.');
  }

  return puzzleIds;
}

function resolveSelectedPuzzleId(
  requestedPuzzle: string | null,
  puzzleIds: string[],
): string {
  if (
    requestedPuzzle !== null &&
    isPuzzleDateId(requestedPuzzle) &&
    puzzleIds.includes(requestedPuzzle)
  ) {
    return requestedPuzzle;
  }

  return puzzleIds[0];
}

async function loadPuzzleJson(puzzleId: string): Promise<Puzzle> {
  const puzzlePath = `${PUZZLE_DIRECTORY}/${puzzleId}/${PUZZLE_FILE_NAME}`;

  const response = await fetch(resolvePublicPath(puzzlePath), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Could not load puzzle: ${response.status} ${response.statusText}`,
    );
  }

  const puzzle = await response.json() as PuzzleJson;
  const panels = puzzle.panels ?? await loadPuzzlePanels(puzzleId);

  return {
    ...puzzle,
    id: puzzleId,
    displayDate: formatPuzzleDisplayDate(puzzleId),
    panels,
  };
}

function getRequestedPuzzleId(): string | null {
  return new URLSearchParams(window.location.search).get('puzzle');
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