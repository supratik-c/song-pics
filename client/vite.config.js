import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = import.meta.dirname;
const contentDirectory = resolve(projectRoot, 'content');
const outputDirectory = resolve(projectRoot, 'dist');
const basePath = process.env.VITE_BASE_PATH ?? '/';
const datedDirectoryPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const puzzleFilenamePattern = /^(\d{4})-(\d{2})-(\d{2})\.json$/;

function copyContent() {
  return {
    name: 'copy-content',
    closeBundle() {
      if (existsSync(contentDirectory)) {
        const contentOutputDirectory = resolve(outputDirectory, 'content');

        copyReleasedContent(contentDirectory, contentOutputDirectory);
        writeReleasedPuzzleIndex(contentOutputDirectory);
      }
    },
  };
}

function copyReleasedContent(sourceDirectory, targetDirectory, relativeDirectory = '') {
  mkdirSync(targetDirectory, { recursive: true });

  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (!shouldCopyEntry(relativeDirectory, entry)) {
      continue;
    }

    const sourcePath = resolve(sourceDirectory, entry.name);
    const targetPath = resolve(targetDirectory, entry.name);

    if (entry.isDirectory()) {
      const childRelativeDirectory = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;

      copyReleasedContent(
        sourcePath,
        targetPath,
        childRelativeDirectory,
      );
      continue;
    }

    if (entry.isFile()) {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function shouldCopyEntry(relativeDirectory, entry) {
  if (
    relativeDirectory === 'puzzles' &&
    entry.isFile() &&
    (entry.name === 'index.json' || isFuturePuzzleFilename(entry.name))
  ) {
    return false;
  }

  if (
    relativeDirectory === 'images' &&
    entry.isDirectory() &&
    isFutureDateDirectory(entry.name)
  ) {
    return false;
  }

  return true;
}

function writeReleasedPuzzleIndex(contentOutputDirectory) {
  const puzzleDirectory = resolve(contentDirectory, 'puzzles');
  const puzzleOutputDirectory = resolve(contentOutputDirectory, 'puzzles');

  if (!existsSync(puzzleDirectory)) {
    return;
  }

  const puzzleFiles = readdirSync(puzzleDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        puzzleFilenamePattern.test(entry.name) &&
        !isFuturePuzzleFilename(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  mkdirSync(puzzleOutputDirectory, { recursive: true });
  writeFileSync(
    resolve(puzzleOutputDirectory, 'index.json'),
    `${JSON.stringify(puzzleFiles, null, 2)}\n`,
  );
}

function isFuturePuzzleFilename(filename) {
  const match = puzzleFilenamePattern.exec(filename);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;

  return dateKey(Number(year), Number(month), Number(day)) > todayKey();
}

function isFutureDateDirectory(name) {
  const match = datedDirectoryPattern.exec(name);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;

  return dateKey(Number(year), Number(month), Number(day)) > todayKey();
}

function todayKey() {
  const today = new Date();

  return dateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
}

function dateKey(year, month, day) {
  return year * 10000 + month * 100 + day;
}

export default defineConfig({
  base: basePath,
  root: projectRoot,
  build: {
    outDir: outputDirectory,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
      },
    },
  },
  plugins: [copyContent()],
});