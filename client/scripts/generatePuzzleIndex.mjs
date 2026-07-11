import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';

const puzzleDirectory = resolve('content/puzzles');
const { puzzleIds, puzzlePanels } = getPuzzleMetadata(puzzleDirectory);

await writeFile(
  join(puzzleDirectory, 'index.json'),
  `${JSON.stringify(puzzleIds, null, 2)}\n`,
);

await writeFile(
  join(puzzleDirectory, 'panels.json'),
  `${JSON.stringify(puzzlePanels, null, 2)}\n`,
);

console.log(
  `Generated puzzle index and panel manifest with ${puzzleIds.length} puzzles.`,
);