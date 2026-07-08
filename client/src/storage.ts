import { type GameState } from './types.ts';

const SHOULD_PERSIST_STATE = !import.meta.env.DEV;

export function loadState(puzzleId: string): GameState {
  const fallback: GameState = { guesses: [], isSolved: false };
  const key = storageKey(puzzleId);

  if (!SHOULD_PERSIST_STATE) {
    localStorage.removeItem(key);
    return fallback;
  }

  const stored = localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<GameState>;
    return {
      guesses: Array.isArray(parsed.guesses) ? parsed.guesses.filter((guess) => typeof guess === 'string') : [],
      isSolved: parsed.isSolved === true,
    };
  } catch {
    return fallback;
  }
}

export function saveState(puzzleId: string, state: GameState): void {
  if (!SHOULD_PERSIST_STATE) {
    return;
  }

  localStorage.setItem(storageKey(puzzleId), JSON.stringify(state));
}

export function storageKey(puzzleId: string): string {
  return `badly-drawn-bangers:${puzzleId}`;
}