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

export function isPuzzleDateId(value: string): boolean {
  return puzzleDateIdPattern.test(value);
}

export function formatPuzzleDisplayDate(dateId: string): string {
  const match = puzzleDateIdPattern.exec(dateId);

  if (!match) {
    throw new Error(`Invalid puzzle date id: ${dateId}`);
  }

  const [, year, month, day] = match;
  const monthName = monthNames[Number(month) - 1];
  const dayNumber = Number(day);

  if (!monthName || dayNumber < 1 || dayNumber > 31) {
    throw new Error(`Invalid puzzle date id: ${dateId}`);
  }

  return `${dayNumber} ${monthName} ${year}`;
}

export function isFuturePuzzleDateId(dateId: string): boolean {
  const match = puzzleDateIdPattern.exec(dateId);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;

  return dateKey(Number(year), Number(month), Number(day)) > todayKey();
}

function todayKey(): number {
  const today = new Date();

  return dateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
}

function dateKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}