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
  type PuzzleArchiveEntry,
  type PuzzleIndexEntry,
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
  const archiveEntries = await loadReleasedArchiveEntries();
  const latestPuzzleId = archiveEntries[0].id;

  const isValidPuzzleId =
    requestedPuzzle !== null &&
    isPuzzleDateId(requestedPuzzle);

  if (
    isValidPuzzleId &&
    isFuturePuzzleDateId(requestedPuzzle)
  ) {
    throw new FuturePuzzleError(requestedPuzzle, {
      entries: archiveEntries,
      latestPuzzleId,
      selectedPuzzleId: requestedPuzzle,
    });
  }

  const selectedPuzzleId = resolveSelectedPuzzleId(
    requestedPuzzle,
    archiveEntries,
  );
  const selectedEntry = archiveEntries.find(
    (entry) => entry.id === selectedPuzzleId,
  );

  if (!selectedEntry) {
    throw new Error(`Puzzle is missing from archive: ${selectedPuzzleId}`);
  }

  const puzzle = await loadPuzzleJson(
    selectedPuzzleId,
    selectedEntry.issueNumber,
  );

  return {
    puzzle,
    archive: {
      entries: archiveEntries,
      latestPuzzleId,
      selectedPuzzleId,
    },
  };
}

async function loadReleasedArchiveEntries(): Promise<PuzzleArchiveEntry[]> {
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
    !result.every(isPuzzleIndexEntry)
  ) {
    throw new Error('Puzzle index contains invalid data.');
  }

  const entries = result
    .filter((entry) => !isFuturePuzzleDateId(entry.id))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry, index) => ({
      ...entry,
      issueNumber: index + 1,
    }))
    .reverse();

  if (entries.length === 0) {
    throw new Error('Puzzle index contains no released puzzles.');
  }

  return entries;
}

function isPuzzleIndexEntry(value: unknown): value is PuzzleIndexEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return typeof entry.id === 'string' &&
    isPuzzleDateId(entry.id) &&
    typeof entry.songClue === 'string' &&
    entry.songClue.trim().length > 0;
}

function resolveSelectedPuzzleId(
  requestedPuzzle: string | null,
  archiveEntries: PuzzleArchiveEntry[],
): string {
  if (
    requestedPuzzle !== null &&
    isPuzzleDateId(requestedPuzzle) &&
    archiveEntries.some((entry) => entry.id === requestedPuzzle)
  ) {
    return requestedPuzzle;
  }

  return archiveEntries[0].id;
}

async function loadPuzzleJson(
  puzzleId: string,
  issueNumber: number,
): Promise<Puzzle> {
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
    issueNumber,
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
