import { describe, expect, it } from 'vitest';
import normalizationFixtureData from '../fixtures/answer-normalization.json';
import {
  createInitialGameState,
  isAcceptedAnswer,
  normalizeAnswer,
  revealSong,
  submitGuess,
} from './game.ts';
import { GAME_RULES, type GameRules } from './gameConfig.ts';
import type { GameState } from './types.ts';

type NormalizationFixture = {
  normalizationCases: Array<{
    name: string;
    input: string;
    artist: string;
    expected: {
      answer: string;
      artistRemoved: boolean;
    };
  }>;
};

const normalizationFixture = normalizationFixtureData as NormalizationFixture;

const solution = {
  acceptedAnswers: ['Hey Jude'],
  artist: 'The Beatles',
};

describe('answer normalization', () => {
  for (const testCase of normalizationFixture.normalizationCases) {
    it(testCase.name, () => {
      expect(normalizeAnswer(testCase.input, testCase.artist)).toEqual(
        testCase.expected,
      );
    });
  }

  it('matches accepted answers after normalization and artist stripping', () => {
    const guess = normalizeAnswer(
      'HÉY, JUDE by The Beatles!',
      solution.artist,
    );

    expect(guess).toEqual({
      answer: 'hey jude',
      artistRemoved: true,
    });
    expect(
      isAcceptedAnswer(
        guess.answer,
        solution.acceptedAnswers,
        solution.artist,
      ),
    ).toBe(true);
  });
});

describe('game transitions', () => {
  it('creates a fresh playing state on each call', () => {
    const first = createInitialGameState();
    const second = createInitialGameState();

    expect(first).toEqual({ guesses: [], status: 'playing' });
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.guesses).not.toBe(first.guesses);
  });

  it.each([
    {
      name: 'an overlong guess',
      guess: 'x'.repeat(GAME_RULES.maxAnswerLength + 1),
      reason: 'too-long',
      artistRemoved: false,
    },
    {
      name: 'an empty guess',
      guess: '  ... ',
      reason: 'empty',
      artistRemoved: false,
    },
    {
      name: 'an artist-only guess',
      guess: 'The Beatles',
      reason: 'artist-only',
      artistRemoved: true,
    },
  ] as const)('rejects $name without consuming an attempt', (testCase) => {
    const state = createInitialGameState();

    expect(
      submitGuess(state, testCase.guess, solution, GAME_RULES),
    ).toEqual({
      kind: 'invalid',
      reason: testCase.reason,
      artistRemoved: testCase.artistRemoved,
    });
    expect(state).toEqual({ guesses: [], status: 'playing' });
  });

  it('rejects a normalized duplicate without consuming an attempt', () => {
    const state: GameState = {
      guesses: ['wrong answer'],
      status: 'playing',
    };

    expect(
      submitGuess(state, 'Wrong, answer!', solution, GAME_RULES),
    ).toEqual({
      kind: 'invalid',
      reason: 'duplicate',
      artistRemoved: false,
    });
    expect(state.guesses).toEqual(['wrong answer']);
  });

  it('records an incorrect guess and remains playable', () => {
    const state = createInitialGameState();
    const result = submitGuess(
      state,
      'Let It Be by The Beatles',
      solution,
      GAME_RULES,
    );

    expect(result).toEqual({
      kind: 'recorded',
      state: { guesses: ['let it be'], status: 'playing' },
      artistRemoved: true,
    });
  });

  it('moves to solved when an accepted answer is recorded', () => {
    const result = submitGuess(
      createInitialGameState(),
      'Hey Jude',
      solution,
      GAME_RULES,
    );

    expect(result).toMatchObject({
      kind: 'recorded',
      state: { guesses: ['hey jude'], status: 'solved' },
    });
  });

  it('moves to failed when the final incorrect attempt is recorded', () => {
    const rules: GameRules = {
      maxAttempts: 2,
      maxAnswerLength: GAME_RULES.maxAnswerLength,
    };
    const state: GameState = {
      guesses: ['first wrong answer'],
      status: 'playing',
    };

    const result = submitGuess(state, 'second wrong answer', solution, rules);

    expect(result).toEqual({
      kind: 'recorded',
      state: {
        guesses: ['first wrong answer', 'second wrong answer'],
        status: 'failed',
      },
      artistRemoved: false,
    });
  });

  it('reveals only an active game', () => {
    const playing: GameState = {
      guesses: ['one'],
      status: 'playing',
    };
    const revealed = revealSong(playing);

    expect(revealed).toEqual({ guesses: ['one'], status: 'revealed' });
    expect(revealed).not.toBe(playing);
    expect(revealed.guesses).not.toBe(playing.guesses);

    for (const status of ['solved', 'revealed', 'failed'] as const) {
      const terminal: GameState = { guesses: ['one'], status };
      expect(revealSong(terminal)).toBe(terminal);
    }
  });

  it('treats submissions in terminal states as no-ops', () => {
    for (const status of ['solved', 'revealed', 'failed'] as const) {
      const state: GameState = { guesses: ['hey jude'], status };

      expect(submitGuess(state, 'anything', solution, GAME_RULES)).toEqual({
        kind: 'invalid',
        reason: 'not-playing',
        artistRemoved: false,
      });
      expect(state).toEqual({ guesses: ['hey jude'], status });
    }
  });

  it('does not mutate the supplied state or guesses', () => {
    const state: GameState = {
      guesses: ['first wrong answer'],
      status: 'playing',
    };
    Object.freeze(state.guesses);
    Object.freeze(state);

    const result = submitGuess(
      state,
      'second wrong answer',
      solution,
      GAME_RULES,
    );

    expect(state).toEqual({
      guesses: ['first wrong answer'],
      status: 'playing',
    });
    expect(result.kind).toBe('recorded');
    if (result.kind === 'recorded') {
      expect(result.state).not.toBe(state);
      expect(result.state.guesses).not.toBe(state.guesses);
    }
  });
});
