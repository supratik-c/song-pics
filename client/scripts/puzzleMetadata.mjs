import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  getPanelImageNumber,
  getPublicPuzzlePanelPath,
  getPuzzleJsonPath,
  isPuzzleDateId,
} from './puzzleConventions.mjs';
import { parsePuzzleJson } from './puzzleValidation.mjs';

export function getPuzzleMetadata(
  puzzleDirectory,
  shouldIncludePuzzle = () => true,
) {
  const puzzleIndex = [];
  const puzzlePanels = {};

  for (const entry of readdirSync(puzzleDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!isPuzzleDateId(entry.name)) {
      throw new Error(`Invalid puzzle date directory: ${entry.name}`);
    }

    const puzzlePath = resolve(puzzleDirectory, entry.name);
    const puzzleEntries = readdirSync(puzzlePath, { withFileTypes: true });
    const puzzleJsonPath = getPuzzleJsonPath(puzzleDirectory, entry.name);

    if (!existsSync(puzzleJsonPath)) {
      throw new Error(`Puzzle is missing puzzle.json: ${puzzlePath}`);
    }

    const puzzleJson = parsePuzzleJson(
      readFileSync(puzzleJsonPath, 'utf8'),
      puzzleJsonPath,
    );
    const panels = getPanelEntries(entry.name, puzzleEntries, puzzlePath);

    if (!shouldIncludePuzzle(entry.name)) {
      continue;
    }

    puzzleIndex.push(getPuzzleIndexEntry(entry.name, puzzleJson));
    puzzlePanels[entry.name] = panels;
  }

  puzzleIndex.sort((left, right) => left.id.localeCompare(right.id));

  return {
    puzzleIndex,
    puzzlePanels: sortObjectByKeys(puzzlePanels),
  };
}

function getPuzzleIndexEntry(puzzleId, puzzleJson) {
  return {
    id: puzzleId,
    songClue: puzzleJson.songClue,
  };
}

function getPanelEntries(puzzleId, puzzleEntries, puzzlePath) {
  const numberedPanels = puzzleEntries
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
    .sort((left, right) => left.number - right.number);

  if (numberedPanels.length === 0) {
    throw new Error(`Puzzle has no numeric panel images: ${puzzlePath}`);
  }

  for (let index = 1; index < numberedPanels.length; index += 1) {
    if (numberedPanels[index - 1].number === numberedPanels[index].number) {
      throw new Error(
        `Puzzle has duplicate panel number ${numberedPanels[index].number}: ${puzzlePath}`,
      );
    }
  }

  return numberedPanels.map((panel) => ({ src: panel.src }));
}

function sortObjectByKeys(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}
