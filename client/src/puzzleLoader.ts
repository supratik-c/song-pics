import { type Puzzle } from './types.ts';

const TODAY_PUZZLE_PATH = '/content/puzzles/2026-07-05.json';

export async function loadPuzzle(path = TODAY_PUZZLE_PATH): Promise<Puzzle> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load puzzle: ${response.status}`);
  }

  return (await response.json()) as Puzzle;
}