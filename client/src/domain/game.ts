import { normalizeText } from '../../shared/textNormalization.mjs';
import type { GameRules } from './gameConfig.ts';
import type { GameState, PuzzleSolution } from './types.ts';

export type InvalidGuessReason =
  | 'too-long'
  | 'empty'
  | 'duplicate'
  | 'not-playing';

export type GuessSubmission =
  | {
    kind: 'recorded';
    state: GameState;
  }
  | {
    kind: 'invalid';
    reason: InvalidGuessReason;
  };

export function createInitialGameState(): GameState {
  return {
    guesses: [],
    status: 'playing',
    artistRevealed: false,
  };
}

export function getAttemptsUsed(
  state: Readonly<GameState>,
  rules: GameRules,
): number {
  return state.guesses.length +
    (state.artistRevealed ? rules.artistRevealCost : 0);
}

export function getAttemptsLeft(
  state: Readonly<GameState>,
  rules: GameRules,
): number {
  return rules.maxAttempts - getAttemptsUsed(state, rules);
}

export function submitGuess(
  state: Readonly<GameState>,
  rawGuess: string,
  solution: Pick<PuzzleSolution, 'acceptedAnswers'>,
  rules: GameRules,
): GuessSubmission {
  if (state.status !== 'playing') {
    return invalid('not-playing');
  }

  if (rawGuess.length > rules.maxAnswerLength) {
    return invalid('too-long');
  }

  const normalized = normalizeAnswer(rawGuess);

  if (normalized.length === 0) {
    return invalid('empty');
  }

  if (state.guesses.includes(normalized)) {
    return invalid('duplicate');
  }

  const guesses = [...state.guesses, normalized];
  const nextState = { ...state, guesses };
  const status = isAcceptedAnswer(normalized, solution.acceptedAnswers)
    ? 'solved'
    : getAttemptsLeft(nextState, rules) <= 0
      ? 'failed'
      : 'playing';

  return {
    kind: 'recorded',
    state: { ...nextState, status },
  };
}

export function revealSong(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  return {
    ...state,
    guesses: [...state.guesses],
    status: 'revealed',
  };
}

export function revealArtist(
  state: Readonly<GameState>,
  rules: GameRules,
): GameState {
  if (state.status !== 'playing' || state.artistRevealed) {
    return state;
  }

  if (getAttemptsLeft(state, rules) <= rules.artistRevealCost) {
    return state;
  }

  return {
    ...state,
    guesses: [...state.guesses],
    artistRevealed: true,
  };
}

export function normalizeAnswer(answer: string): string {
  return normalizeText(answer);
}

export { normalizeText };

export function isAcceptedAnswer(
  guess: string,
  acceptedAnswers: readonly string[],
): boolean {
  return acceptedAnswers.some(
    (acceptedAnswer) => normalizeAnswer(acceptedAnswer) === guess,
  );
}

function invalid(reason: InvalidGuessReason): GuessSubmission {
  return { kind: 'invalid', reason };
}
