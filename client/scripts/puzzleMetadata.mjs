import {
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  getPanelImageNumber,
  getPublicPuzzlePanelPath,
  getPuzzleJsonPath,
  isPuzzleDateId,
} from './puzzleConventions.mjs';

export function getPuzzleMetadata(
  puzzleDirectory,
  shouldIncludePuzzle = () => true,
) {
  const puzzleIds = [];
  const puzzlePanels = {};

  for (const entry of readdirSync(puzzleDirectory, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      !isPuzzleDateId(entry.name) ||
      !shouldIncludePuzzle(entry.name)
    ) {
      continue;
    }

    const puzzlePath = resolve(puzzleDirectory, entry.name);
    const puzzleEntries = readdirSync(puzzlePath, { withFileTypes: true });

    if (!existsSync(getPuzzleJsonPath(puzzleDirectory, entry.name))) {
      continue;
    }

    puzzleIds.push(entry.name);
    puzzlePanels[entry.name] = getPanelEntries(entry.name, puzzleEntries);
  }

  puzzleIds.sort();

  return {
    puzzleIds,
    puzzlePanels: sortObjectByKeys(puzzlePanels),
  };
}

function getPanelEntries(puzzleId, puzzleEntries) {
  return puzzleEntries
    .filter((puzzleEntry) => puzzleEntry.isFile())
    .map((puzzleEntry) => {
      const number = getPanelImageNumber(puzzleEntry.name);

      if (number === null) {
        return null;
      }

      return {
        number,
        src: getPublicPuzzlePanelPath(puzzleId, puzzleEntry.name),
      };
    })
    .filter((panel) => panel !== null)
    .sort((left, right) => left.number - right.number)
    .map((panel) => ({ src: panel.src }));
}

function sortObjectByKeys(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}