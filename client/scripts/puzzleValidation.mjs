import { normalizeText } from '../shared/textNormalization.mjs';
import {
  isNonEmptyString,
  isRecord,
} from '../shared/validationPrimitives.mjs';
import { getYouTubeVideoId } from '../shared/youtubeVideoId.mjs';

const puzzleJsonFields = new Set([
  'songClue',
  'songTitle',
  'artist',
  'acceptedAnswers',
  'youtubeURL',
  'lyricLines',
  'doodledBy',
]);

export function parsePuzzleJson(source, sourcePath) {
  let value;

  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(`Puzzle contains invalid JSON: ${sourcePath}`, {
      cause: error,
    });
  }

  return validatePuzzleJson(value, sourcePath);
}

export function validatePuzzleJson(value, sourcePath = 'puzzle.json') {
  if (!isRecord(value)) {
    throw invalidPuzzle(sourcePath, 'must contain a JSON object');
  }

  const unsupportedField = Object.keys(value).find(
    (field) => !puzzleJsonFields.has(field),
  );

  if (unsupportedField) {
    throw invalidPuzzle(
      sourcePath,
      `${unsupportedField} is not a supported field`,
    );
  }

  assertNonEmptyString(value.songClue, 'songClue', sourcePath);
  assertNonEmptyString(value.songTitle, 'songTitle', sourcePath);
  assertNonEmptyString(value.artist, 'artist', sourcePath);

  if (
    !Array.isArray(value.acceptedAnswers) ||
    value.acceptedAnswers.length === 0
  ) {
    throw invalidPuzzle(
      sourcePath,
      'acceptedAnswers must be a non-empty array',
    );
  }

  value.acceptedAnswers.forEach((answer, index) => {
    assertNonEmptyString(
      answer,
      `acceptedAnswers[${index}]`,
      sourcePath,
    );
  });

  if (value.youtubeURL !== undefined) {
    assertNonEmptyString(value.youtubeURL, 'youtubeURL', sourcePath);

    if (!isSupportedYouTubeUrl(value.youtubeURL)) {
      throw invalidPuzzle(
        sourcePath,
        'youtubeURL must identify a video on youtube.com, youtu.be, or youtube-nocookie.com',
      );
    }
  }

  if (value.doodledBy !== undefined) {
    assertNonEmptyString(value.doodledBy, 'doodledBy', sourcePath);
  }

  if (value.lyricLines !== undefined) {
    if (!Array.isArray(value.lyricLines)) {
      throw invalidPuzzle(sourcePath, 'lyricLines must be an array');
    }

    value.lyricLines.forEach((line, index) => {
      assertNonEmptyString(line, `lyricLines[${index}]`, sourcePath);
    });
  }

  validateAcceptedAnswers(value, sourcePath);

  return value;
}

export function validateLyricLineCount(
  puzzle,
  panelCount,
  sourcePath = 'puzzle.json',
) {
  if (
    puzzle.lyricLines === undefined ||
    puzzle.lyricLines.length === 0 ||
    puzzle.lyricLines.length === panelCount
  ) {
    return;
  }

  throw invalidPuzzle(
    sourcePath,
    `lyricLines must contain exactly ${panelCount} lines to match ${panelCount} panels`,
  );
}

export function normalizePuzzleAnswer(answer) {
  return normalizeText(answer);
}

export function isSupportedYouTubeUrl(value) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }

    // getYouTubeVideoId only recognizes youtube.com, youtu.be, and
    // youtube-nocookie.com hosts, so an unsupported host already falls
    // through to null here without a separate host allow-list check.
    return getYouTubeVideoId(url) !== null;
  } catch {
    return false;
  }
}

function validateAcceptedAnswers(puzzle, sourcePath) {
  const normalizedCanonical = normalizePuzzleAnswer(puzzle.songTitle);
  const normalizedAnswers = new Map();

  puzzle.acceptedAnswers.forEach((answer, index) => {
    const normalized = normalizePuzzleAnswer(answer);

    if (!normalized) {
      throw invalidPuzzle(
        sourcePath,
        `acceptedAnswers[${index}] is empty after normalization`,
      );
    }

    const duplicateIndex = normalizedAnswers.get(normalized);

    if (duplicateIndex !== undefined) {
      throw invalidPuzzle(
        sourcePath,
        `acceptedAnswers[${index}] duplicates acceptedAnswers[${duplicateIndex}] after normalization`,
      );
    }

    normalizedAnswers.set(normalized, index);
  });

  if (!normalizedAnswers.has(normalizedCanonical)) {
    throw invalidPuzzle(
      sourcePath,
      'acceptedAnswers must include the canonical songTitle after normalization',
    );
  }
}

function assertNonEmptyString(value, field, sourcePath) {
  if (!isNonEmptyString(value)) {
    throw invalidPuzzle(sourcePath, `${field} must be a non-empty string`);
  }
}

function invalidPuzzle(sourcePath, reason) {
  return new Error(`Invalid puzzle ${sourcePath}: ${reason}.`);
}
