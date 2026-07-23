import { resolvePublicPath } from './publicPath.ts';
import {
  formatPuzzleDisplayDate,
  isFuturePuzzleDateId,
  isPuzzleDateId,
} from './puzzleDates.ts';
import {
  FuturePuzzleError,
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchiveEntry,
  type PuzzleIndexEntry,
  type PuzzleJson,
  type PuzzlePanel,
  type PuzzlePanelsManifest,
} from './types.ts';
import {
  fetchStaticJson,
  isNonEmptyString,
  isOptionalNonEmptyString,
  isRecord,
} from './validation.ts';

const PUZZLE_DIRECTORY = '/content/puzzles';
const PUZZLE_FILE_NAME = 'puzzle.json';
const PUZZLE_INDEX_PATH = `${PUZZLE_DIRECTORY}/index.json`;
const PUZZLE_PANELS_PATH = `${PUZZLE_DIRECTORY}/panels.json`;

export async function loadPuzzle(
  requestedPuzzleId: string | null,
): Promise<LoadedPuzzle> {
  const archiveEntries = await loadReleasedArchiveEntries();
  const latestPuzzleId = archiveEntries[0].id;
  const requestedPuzzleIsValid =
    requestedPuzzleId !== null && isPuzzleDateId(requestedPuzzleId);

  if (
    requestedPuzzleIsValid &&
    isFuturePuzzleDateId(requestedPuzzleId)
  ) {
    throw new FuturePuzzleError(requestedPuzzleId, {
      entries: archiveEntries,
      latestPuzzleId,
      selectedPuzzleId: requestedPuzzleId,
    });
  }

  const selectedPuzzleId = resolveSelectedPuzzleId(
    requestedPuzzleId,
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

export function isPuzzleJson(value: unknown): value is PuzzleJson {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.songClue) &&
    isNonEmptyString(value.songTitle) &&
    isNonEmptyString(value.artist) &&
    Array.isArray(value.acceptedAnswers) &&
    value.acceptedAnswers.length > 0 &&
    value.acceptedAnswers.every(isNonEmptyString) &&
    isOptionalNonEmptyString(value.youtubeURL) &&
    (
      value.panels === undefined ||
      (
        Array.isArray(value.panels) &&
        value.panels.length > 0 &&
        value.panels.every(isPuzzlePanel)
      )
    )
  );
}

export function isPuzzlePanelsManifest(
  value: unknown,
): value is PuzzlePanelsManifest {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([puzzleId, panels]) =>
        isPuzzleDateId(puzzleId) &&
        Array.isArray(panels) &&
        panels.length > 0 &&
        panels.every(isPuzzlePanel),
    )
  );
}

export function isPuzzleIndex(
  value: unknown,
): value is PuzzleIndexEntry[] {
  return Array.isArray(value) && value.every(isPuzzleIndexEntry);
}

async function loadReleasedArchiveEntries(): Promise<PuzzleArchiveEntry[]> {
  const result = await fetchStaticJson(
    resolvePublicPath(PUZZLE_INDEX_PATH),
    'puzzle list',
    isPuzzleIndex,
  );
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
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isPuzzleDateId(value.id) &&
    isNonEmptyString(value.songClue)
  );
}

function isPuzzlePanel(value: unknown): value is PuzzlePanel {
  return isRecord(value) && isNonEmptyString(value.src);
}

function resolveSelectedPuzzleId(
  requestedPuzzleId: string | null,
  archiveEntries: PuzzleArchiveEntry[],
): string {
  if (
    requestedPuzzleId !== null &&
    isPuzzleDateId(requestedPuzzleId) &&
    archiveEntries.some((entry) => entry.id === requestedPuzzleId)
  ) {
    return requestedPuzzleId;
  }

  return archiveEntries[0].id;
}

async function loadPuzzleJson(
  puzzleId: string,
  issueNumber: number,
): Promise<Puzzle> {
  const puzzlePath =
    `${PUZZLE_DIRECTORY}/${puzzleId}/${PUZZLE_FILE_NAME}`;
  const puzzleJson = await fetchStaticJson(
    resolvePublicPath(puzzlePath),
    'puzzle',
    isPuzzleJson,
  );
  const panels = puzzleJson.panels ?? await loadPuzzlePanels(puzzleId);
  const { panels: _explicitPanels, ...puzzleContent } = puzzleJson;

  return {
    ...puzzleContent,
    id: puzzleId,
    displayDate: formatPuzzleDisplayDate(puzzleId),
    issueNumber,
    panels,
  };
}

async function loadPuzzlePanels(puzzleId: string): Promise<PuzzlePanel[]> {
  const manifest = await fetchStaticJson(
    resolvePublicPath(PUZZLE_PANELS_PATH),
    'puzzle panels',
    isPuzzlePanelsManifest,
  );
  const panels = manifest[puzzleId];

  if (!panels) {
    throw new Error(`Puzzle has no generated panels: ${puzzleId}`);
  }

  return panels;
}
