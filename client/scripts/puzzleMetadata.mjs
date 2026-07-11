import {
  existsSync,
  readdirSync,
} from 'node:fs';
import { resolve } from 'node:path';

const puzzleDateIdPattern = /^\d{4}-\d{2}-\d{2}$/;
const panelImagePattern = /^(\d+)\.(?:avif|gif|jpe?g|png|webp)$/i;

export function getPuzzleMetadata(
  puzzleDirectory,
  shouldIncludePuzzle = () => true,
) {
  const puzzleIds = [];
  const puzzlePanels = {};

  for (const entry of readdirSync(puzzleDirectory, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      !puzzleDateIdPattern.test(entry.name) ||
      !shouldIncludePuzzle(entry.name)
    ) {
      continue;
    }

    const puzzlePath = resolve(puzzleDirectory, entry.name);
    const puzzleEntries = readdirSync(puzzlePath, { withFileTypes: true });

    if (!existsSync(resolve(puzzlePath, 'puzzle.json'))) {
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
      const match = panelImagePattern.exec(puzzleEntry.name);

      if (!match) {
        return null;
      }

      return {
        number: Number(match[1]),
        src: `/content/puzzles/${puzzleId}/${puzzleEntry.name}`,
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