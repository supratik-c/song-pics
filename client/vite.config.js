import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import {
  CONTENT_DIRECTORY_NAME,
  PUZZLES_DIRECTORY_NAME,
  getPuzzleDirectory,
  isFuturePuzzleDateId,
  isPuzzleManifestFileName,
  writePuzzleMetadataFiles,
} from './scripts/puzzleConventions.mjs';
import { getPuzzleMetadata } from './scripts/puzzleMetadata.mjs';

const projectRoot = import.meta.dirname;
const contentDirectory = resolve(projectRoot, CONTENT_DIRECTORY_NAME);
const outputDirectory = resolve(projectRoot, 'dist');
const basePath = process.env.VITE_BASE_PATH ?? '/';

function copyContent() {
  return {
    name: 'copy-content',
    closeBundle() {
      if (existsSync(contentDirectory)) {
        const contentOutputDirectory = resolve(outputDirectory, 'content');

        copyReleasedContent(contentDirectory, contentOutputDirectory);
        writeReleasedPuzzleMetadata(contentOutputDirectory);
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
    relativeDirectory === PUZZLES_DIRECTORY_NAME &&
    entry.isFile() &&
    isPuzzleManifestFileName(entry.name)
  ) {
    return false;
  }

  if (
    relativeDirectory === PUZZLES_DIRECTORY_NAME &&
    entry.isDirectory() &&
    isFuturePuzzleDateId(entry.name)
  ) {
    return false;
  }

  return true;
}

function writeReleasedPuzzleMetadata(contentOutputDirectory) {
  const puzzleDirectory = getPuzzleDirectory(projectRoot);
  const puzzleOutputDirectory = resolve(
    contentOutputDirectory,
    PUZZLES_DIRECTORY_NAME,
  );

  if (!existsSync(puzzleDirectory)) {
    return;
  }

  const { puzzleIds, puzzlePanels } = getPuzzleMetadata(
    puzzleDirectory,
    (puzzleId) => !isFuturePuzzleDateId(puzzleId),
  );

  writePuzzleMetadataFiles(puzzleOutputDirectory, {
    puzzleIds,
    puzzlePanels,
  });
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