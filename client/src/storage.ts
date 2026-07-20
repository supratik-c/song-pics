import { MAX_ATTEMPTS } from './constants.ts';
import {
  type GameState,
  type GameStatus,
} from './types.ts';

const SHOULD_PERSIST_STATE = !import.meta.env.DEV;

export function loadState(puzzleId: string): GameState {
  const fallback: GameState = {
    guesses: [],
    status: 'playing',
  };
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
    const parsed: unknown = JSON.parse(stored);

    if (!isRecord(parsed)) {
      return fallback;
    }

    const guesses = Array.isArray(parsed.guesses)
      ? parsed.guesses.filter(
        (guess): guess is string =>
          typeof guess === 'string',
      )
      : [];

    return {
      guesses,
      status: resolveStoredStatus(parsed, guesses.length),
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

function resolveStoredStatus(
  value: Record<string, unknown>,
  guessCount: number,
): GameStatus {
  if (isGameStatus(value.status)) {
    if (
      value.status === 'playing' &&
      guessCount >= MAX_ATTEMPTS
    ) {
      return 'failed';
    }

    return value.status;
  }

  if (value.isSolved === true) {
    return 'solved';
  }

  if (guessCount >= MAX_ATTEMPTS) {
    return 'failed';
  }

  return 'playing';
}

function isGameStatus(value: unknown): value is GameStatus {
  return (
    value === 'playing' ||
    value === 'solved' ||
    value === 'revealed' ||
    value === 'failed'
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}
