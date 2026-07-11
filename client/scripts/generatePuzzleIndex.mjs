import { readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const puzzleDirectory = resolve('content/puzzles');

const entries = await readdir(puzzleDirectory, {
  withFileTypes: true,
});

const puzzleFiles = entries
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      entry.name !== 'index.json',
  )
  .map((entry) => entry.name)
  .sort();

await writeFile(
  join(puzzleDirectory, 'index.json'),
  `${JSON.stringify(puzzleFiles, null, 2)}\n`,
);

console.log(`Generated puzzle index with ${puzzleFiles.length} files.`);