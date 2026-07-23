import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  PUZZLES_DIRECTORY_NAME,
  getPuzzleDirectory,
  isFuturePuzzleDateId,
  isPuzzleDateId,
  isPuzzleManifestFileName,
  writePuzzleMetadataFiles,
} from './puzzleConventions.mjs';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';

export function copyReleasedContent(
  sourceDirectory,
  targetDirectory,
  { today = new Date() } = {},
) {
  copyReleasedDirectory(sourceDirectory, targetDirectory, '', today);
}

export function shouldCopyReleasedEntry(
  relativeDirectory,
  entry,
  today = new Date(),
) {
  if (
    relativeDirectory === PUZZLES_DIRECTORY_NAME &&
    entry.isFile() &&
    isPuzzleManifestFileName(entry.name)
  ) {
    return false;
  }

  if (relativeDirectory === PUZZLES_DIRECTORY_NAME && entry.isDirectory()) {
    if (!isPuzzleDateId(entry.name)) {
      throw new Error(`Invalid puzzle date directory: ${entry.name}`);
    }

    if (isFuturePuzzleDateId(entry.name, today)) {
      return false;
    }
  }

  return true;
}

export function writeReleasedPuzzleMetadata(
  projectRoot,
  contentOutputDirectory,
  { today = new Date() } = {},
) {
  const puzzleDirectory = getPuzzleDirectory(projectRoot);
  const puzzleOutputDirectory = resolve(
    contentOutputDirectory,
    PUZZLES_DIRECTORY_NAME,
  );

  if (!existsSync(puzzleDirectory)) {
    return;
  }

  const { puzzleIndex, puzzlePanels } = getPuzzleMetadata(
    puzzleDirectory,
    (puzzleId) => !isFuturePuzzleDateId(puzzleId, today),
  );

  writePuzzleMetadataFiles(puzzleOutputDirectory, {
    puzzleIndex,
    puzzlePanels,
  });
}

function copyReleasedDirectory(
  sourceDirectory,
  targetDirectory,
  relativeDirectory,
  today,
) {
  mkdirSync(targetDirectory, { recursive: true });

  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (!shouldCopyReleasedEntry(relativeDirectory, entry, today)) {
      continue;
    }

    const sourcePath = resolve(sourceDirectory, entry.name);
    const targetPath = resolve(targetDirectory, entry.name);

    if (entry.isDirectory()) {
      const childRelativeDirectory = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;

      copyReleasedDirectory(
        sourcePath,
        targetPath,
        childRelativeDirectory,
        today,
      );
      continue;
    }

    if (entry.isFile()) {
      copyFileSync(sourcePath, targetPath);
    }
  }
}
