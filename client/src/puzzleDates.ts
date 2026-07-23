const puzzleDateIdPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type PuzzleDateParts = {
  year: number;
  month: number;
  day: number;
};

export function isPuzzleDateId(value: string): boolean {
  return parsePuzzleDateId(value) !== null;
}

export function formatPuzzleDisplayDate(dateId: string): string {
  const parts = parsePuzzleDateId(dateId);

  if (!parts) {
    throw new Error(`Invalid puzzle date id: ${dateId}`);
  }

  return `${parts.day} ${monthNames[parts.month - 1]} ${parts.year}`;
}

export function isFuturePuzzleDateId(
  dateId: string,
  now: Date = new Date(),
): boolean {
  const parts = parsePuzzleDateId(dateId);

  if (!parts) {
    return false;
  }

  return dateKey(parts.year, parts.month, parts.day) > dateKey(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

function parsePuzzleDateId(dateId: string): PuzzleDateParts | null {
  const match = puzzleDateIdPattern.exec(dateId);

  if (!match) {
    return null;
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  if (
    parts.year < 1 ||
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > getDaysInMonth(parts.year, parts.month)
  ) {
    return null;
  }

  return parts;
}

function dateKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);
}
