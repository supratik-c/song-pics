import {
  dateKey,
  isValidPuzzleDateParts,
  parsePuzzleDateParts,
} from '../../shared/puzzleDateMath.mjs';

const monthAbbreviations = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function isPuzzleDateId(value: string): boolean {
  return isValidPuzzleDateParts(parsePuzzleDateParts(value));
}

export function formatPuzzleDisplayDate(dateId: string): string {
  const parts = parsePuzzleDateParts(dateId);

  if (!isValidPuzzleDateParts(parts)) {
    throw new Error(`Invalid puzzle date id: ${dateId}`);
  }

  const twoDigitYear = String(parts.year % 100).padStart(2, '0');

  return `${parts.day} ${monthAbbreviations[parts.month - 1]} ${twoDigitYear}`;
}

export function isFuturePuzzleDateId(
  dateId: string,
  now: Date = new Date(),
): boolean {
  const parts = parsePuzzleDateParts(dateId);

  if (!isValidPuzzleDateParts(parts)) {
    return false;
  }

  return dateKey(parts.year, parts.month, parts.day) > dateKey(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}
