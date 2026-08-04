// @ts-check
// Puzzle date-id parsing and calendar arithmetic shared between the
// browser app (src/) and the Node build scripts (scripts/). Loaded by
// vite.config.js at config-load time via puzzleConventions.mjs, so this
// stays plain Node-safe: no DOM, no import.meta.env.

const puzzleDateIdPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * @typedef {{ year: number, month: number, day: number }} PuzzleDateParts
 */

/**
 * @param {string} value
 * @returns {PuzzleDateParts | null}
 */
export function parsePuzzleDateParts(value) {
  const match = puzzleDateIdPattern.exec(value);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/**
 * @param {PuzzleDateParts | null} parts
 * @returns {parts is PuzzleDateParts}
 */
export function isValidPuzzleDateParts(parts) {
  return (
    parts !== null &&
    parts.year >= 1 &&
    parts.month >= 1 &&
    parts.month <= 12 &&
    parts.day >= 1 &&
    parts.day <= getDaysInMonth(parts.year, parts.month)
  );
}

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {number}
 */
export function dateKey(year, month, day) {
  return year * 10000 + month * 100 + day;
}

/**
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
