import { readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const puzzleDirectory = resolve('content/puzzles');
const puzzleDateIdPattern = /^\d{4}-\d{2}-\d{2}$/;

const entries = await readdir(puzzleDirectory, {
  withFileTypes: true,
});

const puzzleIds = [];

for (const entry of entries) {
  if (!entry.isDirectory() || !puzzleDateIdPattern.test(entry.name)) {
    continue;
  }

  const puzzleEntries = await readdir(join(puzzleDirectory, entry.name), {
    withFileTypes: true,
  });

  if (
    puzzleEntries.some(
      (puzzleEntry) =>
        puzzleEntry.isFile() && puzzleEntry.name === 'puzzle.json',
    )
  ) {
    puzzleIds.push(entry.name);
  }
}

puzzleIds.sort();

await writeFile(
  join(puzzleDirectory, 'index.json'),
  `${JSON.stringify(puzzleIds, null, 2)}\n`,
);

console.log(`Generated puzzle index with ${puzzleIds.length} puzzles.`);