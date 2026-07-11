const puzzleDateIdPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isPuzzleDateId(value: string): boolean {
  return puzzleDateIdPattern.test(value);
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