import type { GameRules } from './gameConfig.ts';
import type {
  GameState,
  PuzzleSolution,
} from './types.ts';

export type NormalizedAnswer = {
  answer: string;
  artistRemoved: boolean;
};

export type InvalidGuessReason =
  | 'too-long'
  | 'empty'
  | 'artist-only'
  | 'duplicate'
  | 'not-playing';

export type GuessSubmission =
  | {
    kind: 'recorded';
    state: GameState;
    artistRemoved: boolean;
  }
  | {
    kind: 'invalid';
    reason: InvalidGuessReason;
    artistRemoved: boolean;
  };

export function createInitialGameState(): GameState {
  return {
    guesses: [],
    status: 'playing',
  };
}

export function submitGuess(
  state: Readonly<GameState>,
  rawGuess: string,
  solution: Pick<PuzzleSolution, 'acceptedAnswers' | 'artist'>,
  rules: GameRules,
): GuessSubmission {
  if (state.status !== 'playing') {
    return invalid('not-playing');
  }

  if (rawGuess.length > rules.maxAnswerLength) {
    return invalid('too-long');
  }

  const normalized = normalizeAnswer(rawGuess, solution.artist);

  if (normalized.answer.length === 0) {
    return invalid(
      normalized.artistRemoved ? 'artist-only' : 'empty',
      normalized.artistRemoved,
    );
  }

  if (state.guesses.includes(normalized.answer)) {
    return invalid('duplicate', normalized.artistRemoved);
  }

  const guesses = [...state.guesses, normalized.answer];
  const status = isAcceptedAnswer(
    normalized.answer,
    solution.acceptedAnswers,
    solution.artist,
  )
    ? 'solved'
    : guesses.length >= rules.maxAttempts
      ? 'failed'
      : 'playing';

  return {
    kind: 'recorded',
    state: { guesses, status },
    artistRemoved: normalized.artistRemoved,
  };
}

export function revealSong(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  return {
    guesses: [...state.guesses],
    status: 'revealed',
  };
}

export function normalizeAnswer(
  answer: string,
  artist: string,
): NormalizedAnswer {
  const normalizedInput = normalizeText(answer);
  const normalizedArtist = normalizeText(artist);

  const answerWords = normalizedInput.length > 0
    ? normalizedInput.split(' ')
    : [];
  const artistWords = normalizedArtist.length > 0
    ? normalizedArtist.split(' ')
    : [];

  let artistRemoved = false;

  /* Try longer artist subsets before shorter ones. */
  for (
    let subsetLength = artistWords.length;
    subsetLength >= 1;
    subsetLength -= 1
  ) {
    for (
      let artistStart = 0;
      artistStart <= artistWords.length - subsetLength;
      artistStart += 1
    ) {
      const artistSubset = artistWords.slice(
        artistStart,
        artistStart + subsetLength,
      );

      let answerStart = 0;

      while (answerStart <= answerWords.length - artistSubset.length) {
        const matches = artistSubset.every(
          (word, index) => answerWords[answerStart + index] === word,
        );

        if (!matches) {
          answerStart += 1;
          continue;
        }

        answerWords.splice(answerStart, artistSubset.length);
        artistRemoved = true;

        if (answerStart > 0 && answerWords[answerStart - 1] === 'by') {
          answerWords.splice(answerStart - 1, 1);
          answerStart -= 1;
        }
      }
    }
  }

  return {
    answer: answerWords.join(' ').trim(),
    artistRemoved,
  };
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function isAcceptedAnswer(
  guess: string,
  acceptedAnswers: readonly string[],
  artist: string,
): boolean {
  return acceptedAnswers.some(
    (acceptedAnswer) =>
      normalizeAnswer(acceptedAnswer, artist).answer === guess,
  );
}

function invalid(
  reason: InvalidGuessReason,
  artistRemoved = false,
): GuessSubmission {
  return { kind: 'invalid', reason, artistRemoved };
}
