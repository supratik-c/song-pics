import {
  formatPuzzleDisplayDate,
  isFuturePuzzleDateId,
  isPuzzleDateId,
} from '../domain/puzzleDates.ts';
import {
  FuturePuzzleError,
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchiveEntry,
  type PuzzleIndexEntry,
  type PuzzleJson,
  type PuzzlePanel,
  type PuzzlePanelsManifest,
} from '../domain/types.ts';
import { resolvePublicPath } from './publicPath.ts';
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
type SettledResult<Value> =
  | { status: 'fulfilled'; value: Value }
  | { status: 'rejected'; reason: unknown };
const puzzleJsonFields = new Set([
  'songClue',
  'songTitle',
  'artist',
  'acceptedAnswers',
  'youtubeURL',
  'lyricLines',
  'doodledBy',
]);

export async function loadPuzzle(
  requestedPuzzleId: string | null,
): Promise<LoadedPuzzle> {
  const requestedPuzzleIsValid =
    requestedPuzzleId !== null && isPuzzleDateId(requestedPuzzleId);
  const archiveEntriesPromise = loadReleasedArchiveEntries();

  if (
    requestedPuzzleIsValid &&
    isFuturePuzzleDateId(requestedPuzzleId)
  ) {
    const archiveEntries = await archiveEntriesPromise;
    const latestPuzzleId = archiveEntries[0].id;

    throw new FuturePuzzleError(requestedPuzzleId, {
      entries: archiveEntries,
      latestPuzzleId,
      selectedPuzzleId: requestedPuzzleId,
    });
  }

  const panelsManifestPromise = loadPuzzlePanelsManifest();
  const requestedPuzzleResultPromise = requestedPuzzleIsValid
    ? settle(loadPuzzleSource(requestedPuzzleId))
    : null;
  const [archiveEntries, panelsManifest] = await Promise.all([
    archiveEntriesPromise,
    panelsManifestPromise,
  ]);
  const latestPuzzleId = archiveEntries[0].id;
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

  let puzzleSource: PuzzleJson;

  if (
    requestedPuzzleResultPromise &&
    selectedPuzzleId === requestedPuzzleId
  ) {
    const requestedPuzzleResult = await requestedPuzzleResultPromise;

    if (requestedPuzzleResult.status === 'rejected') {
      throw requestedPuzzleResult.reason;
    }

    puzzleSource = requestedPuzzleResult.value;
  } else {
    puzzleSource = await loadPuzzleSource(selectedPuzzleId);
  }

  const puzzle = assemblePuzzle(
    selectedPuzzleId,
    selectedEntry.issueNumber,
    puzzleSource,
    selectPuzzlePanels(panelsManifest, selectedPuzzleId),
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
    Object.keys(value).every((field) => puzzleJsonFields.has(field)) &&
    isNonEmptyString(value.songClue) &&
    isNonEmptyString(value.songTitle) &&
    isNonEmptyString(value.artist) &&
    Array.isArray(value.acceptedAnswers) &&
    value.acceptedAnswers.length > 0 &&
    value.acceptedAnswers.every(isNonEmptyString) &&
    isOptionalNonEmptyString(value.youtubeURL) &&
    isOptionalNonEmptyString(value.doodledBy) &&
    (
      value.lyricLines === undefined ||
      (
        Array.isArray(value.lyricLines) &&
        value.lyricLines.every(isNonEmptyString)
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
    { cache: 'default' },
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

async function loadPuzzleSource(
  puzzleId: string,
): Promise<PuzzleJson> {
  const puzzlePath =
    `${PUZZLE_DIRECTORY}/${puzzleId}/${PUZZLE_FILE_NAME}`;

  return fetchStaticJson(
    resolvePublicPath(puzzlePath),
    'puzzle',
    isPuzzleJson,
    { cache: 'default' },
  );
}

async function loadPuzzlePanelsManifest(): Promise<PuzzlePanelsManifest> {
  return fetchStaticJson(
    resolvePublicPath(PUZZLE_PANELS_PATH),
    'puzzle panels',
    isPuzzlePanelsManifest,
    { cache: 'default' },
  );
}

function selectPuzzlePanels(
  manifest: PuzzlePanelsManifest,
  puzzleId: string,
): PuzzlePanel[] {
  const panels = manifest[puzzleId];

  if (!panels) {
    throw new Error(`Puzzle has no generated panels: ${puzzleId}`);
  }

  return panels;
}

function assemblePuzzle(
  puzzleId: string,
  issueNumber: number,
  puzzleJson: PuzzleJson,
  panels: PuzzlePanel[],
): Puzzle {
  if (
    puzzleJson.lyricLines &&
    puzzleJson.lyricLines.length > 0 &&
    puzzleJson.lyricLines.length !== panels.length
  ) {
    throw new Error(
      `Puzzle lyricLines must contain exactly ${panels.length} lines to match ${panels.length} panels: ${puzzleId}`,
    );
  }

  return {
    ...puzzleJson,
    id: puzzleId,
    displayDate: formatPuzzleDisplayDate(puzzleId),
    issueNumber,
    panels,
  };
}

function settle<Value>(
  promise: Promise<Value>,
): Promise<SettledResult<Value>> {
  return promise.then(
    (value) => ({ status: 'fulfilled', value }),
    (reason: unknown) => ({ status: 'rejected', reason }),
  );
}
