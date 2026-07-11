import { type Puzzle } from './types.ts';
import { resolvePublicPath } from './publicPath.ts';
import { TODAY_PUZZLE_PATH } from './constants.ts';

export async function loadPuzzle(path = TODAY_PUZZLE_PATH): Promise<Puzzle> {
  const response = await fetch(resolvePublicPath(path));

  if (!response.ok) {
    throw new Error(`Could not load puzzle: ${response.status}`);
  }

  return (await response.json()) as Puzzle;
}