import {
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

export const CONTENT_DIRECTORY_NAME = 'content';
export const PUZZLES_DIRECTORY_NAME = 'puzzles';
export const PUZZLE_FILE_NAME = 'puzzle.json';
export const PUZZLE_INDEX_FILE_NAME = 'index.json';
export const PUZZLE_PANELS_FILE_NAME = 'panels.json';
export const PUBLIC_PUZZLE_DIRECTORY = `/${CONTENT_DIRECTORY_NAME}/${PUZZLES_DIRECTORY_NAME}`;

const puzzleDateIdPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const panelImagePattern = /^(\d+)\.(?:avif|gif|jpe?g|png|webp)$/i;

export function getPuzzleDirectory(rootDirectory = process.cwd()) {
  return resolve(rootDirectory, CONTENT_DIRECTORY_NAME, PUZZLES_DIRECTORY_NAME);
}

export function getPuzzleJsonPath(puzzleDirectory, puzzleId) {
  return resolve(puzzleDirectory, puzzleId, PUZZLE_FILE_NAME);
}

export function getPuzzleIndexPath(puzzleDirectory) {
  return resolve(puzzleDirectory, PUZZLE_INDEX_FILE_NAME);
}

export function getPuzzlePanelsPath(puzzleDirectory) {
  return resolve(puzzleDirectory, PUZZLE_PANELS_FILE_NAME);
}

export function isPuzzleManifestFileName(fileName) {
  return fileName === PUZZLE_INDEX_FILE_NAME ||
    fileName === PUZZLE_PANELS_FILE_NAME;
}

export function isPuzzleDateId(value) {
  const parts = getPuzzleDateParts(value);

  if (!parts) {
    return false;
  }

  const { year, month, day } = parts;

  return year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= getDaysInMonth(year, month);
}

export function isFuturePuzzleDateId(value, today = new Date()) {
  const parts = getPuzzleDateParts(value);

  if (!parts || !isPuzzleDateId(value)) {
    return false;
  }

  const { year, month, day } = parts;

  return dateKey(year, month, day) > todayKey(today);
}

export function getPanelImageNumber(fileName) {
  const match = panelImagePattern.exec(fileName);

  return match ? Number(match[1]) : null;
}

export function getPublicPuzzlePanelPath(puzzleId, fileName) {
  return `${PUBLIC_PUZZLE_DIRECTORY}/${puzzleId}/${fileName}`;
}

export function writePuzzleMetadataFiles(
  puzzleDirectory,
  { puzzleIndex, puzzlePanels },
) {
  mkdirSync(puzzleDirectory, { recursive: true });
  writeFileSync(
    getPuzzleIndexPath(puzzleDirectory),
    `${JSON.stringify(puzzleIndex, null, 2)}\n`,
  );
  writeFileSync(
    getPuzzlePanelsPath(puzzleDirectory),
    `${JSON.stringify(puzzlePanels, null, 2)}\n`,
  );
}

function todayKey(today) {
  return dateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
}

function dateKey(year, month, day) {
  return year * 10000 + month * 100 + day;
}

function getPuzzleDateParts(value) {
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

function getDaysInMonth(year, month) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year) {
  return year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);
}
