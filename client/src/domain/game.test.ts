import { describe, expect, it } from 'vitest';
import normalizationFixtureData from '../../fixtures/answer-normalization.json';
import {
  createInitialGameState,
  getAttemptsLeft,
  getAttemptsUsed,
  isAcceptedAnswer,
  normalizeAnswer,
  revealArtist,
  revealSong,
  submitGuess,
} from './game.ts';
import { GAME_RULES, type GameRules } from './gameConfig.ts';
import type { GameState } from './types.ts';

type NormalizationFixture = {
  normalizationCases: Array<{
    name: string;
    input: string;
    expected: string;
  }>;
};

const normalizationFixture = normalizationFixtureData as NormalizationFixture;

const solution = {
  acceptedAnswers: ['Hey Jude'],
};

describe('answer normalization', () => {
  for (const testCase of normalizationFixture.normalizationCases) {
    it(testCase.name, () => {
      expect(normalizeAnswer(testCase.input)).toBe(testCase.expected);
    });
  }

  it('matches accepted answers after text normalization', () => {
    const guess = normalizeAnswer('HÉY, JUDE!');

    expect(guess).toBe('hey jude');
    expect(isAcceptedAnswer(guess, solution.acceptedAnswers)).toBe(true);
  });

  it('does not ignore artist text when matching an answer', () => {
    const guess = normalizeAnswer('HÉY, JUDE by The Beatles!');

    expect(guess).toBe('hey jude by the beatles');
    expect(isAcceptedAnswer(guess, solution.acceptedAnswers)).toBe(false);
  });
});

describe('game transitions', () => {
  it('creates a fresh playing state on each call', () => {
    const first = createInitialGameState();
    const second = createInitialGameState();

    expect(first).toEqual({
      guesses: [],
      status: 'playing',
      artistRevealed: false,
    });
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.guesses).not.toBe(first.guesses);
  });

  it.each([
    {
      name: 'an overlong guess',
      guess: 'x'.repeat(GAME_RULES.maxAnswerLength + 1),
      reason: 'too-long',
    },
    {
      name: 'an empty guess',
      guess: '  ... ',
      reason: 'empty',
    },
  ] as const)('rejects $name without consuming an attempt', (testCase) => {
    const state = createInitialGameState();

    expect(
      submitGuess(state, testCase.guess, solution, GAME_RULES),
    ).toEqual({
      kind: 'invalid',
      reason: testCase.reason,
    });
    expect(state).toEqual({
      guesses: [],
      status: 'playing',
      artistRevealed: false,
    });
  });

  it('rejects a normalized duplicate without consuming an attempt', () => {
    const state: GameState = {
      guesses: ['wrong answer'],
      status: 'playing',
      artistRevealed: false,
    };

    expect(
      submitGuess(state, 'Wrong, answer!', solution, GAME_RULES),
    ).toEqual({
      kind: 'invalid',
      reason: 'duplicate',
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
      state: {
        guesses: ['let it be by the beatles'],
        status: 'playing',
        artistRevealed: false,
      },
    });
  });

  it.each(['The', 'The Killers'])(
    'records artist-related guess %j as an incorrect attempt',
    (guess) => {
      const result = submitGuess(
        createInitialGameState(),
        guess,
        { acceptedAnswers: ['Mr Brightside'] },
        GAME_RULES,
      );

      expect(result).toEqual({
        kind: 'recorded',
        state: {
          guesses: [normalizeAnswer(guess)],
          status: 'playing',
          artistRevealed: false,
        },
      });
    },
  );

  it('does not accept a song title followed by artist text', () => {
    const result = submitGuess(
      createInitialGameState(),
      'Mr Brightside by The Killers',
      { acceptedAnswers: ['Mr Brightside'] },
      GAME_RULES,
    );

    expect(result).toEqual({
      kind: 'recorded',
      state: {
        guesses: ['mr brightside by the killers'],
        status: 'playing',
        artistRevealed: false,
      },
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
      artistRevealCost: GAME_RULES.artistRevealCost,
    };
    const state: GameState = {
      guesses: ['first wrong answer'],
      status: 'playing',
      artistRevealed: false,
    };

    const result = submitGuess(state, 'second wrong answer', solution, rules);

    expect(result).toEqual({
      kind: 'recorded',
      state: {
        guesses: ['first wrong answer', 'second wrong answer'],
        status: 'failed',
        artistRevealed: false,
      },
    });
  });

  it('moves to failed once a reveal-inclusive attempt count is exhausted', () => {
    const rules: GameRules = {
      maxAttempts: 3,
      maxAnswerLength: GAME_RULES.maxAnswerLength,
      artistRevealCost: 2,
    };
    const state: GameState = {
      guesses: [],
      status: 'playing',
      artistRevealed: true,
    };

    const result = submitGuess(state, 'wrong answer', solution, rules);

    expect(result).toEqual({
      kind: 'recorded',
      state: {
        guesses: ['wrong answer'],
        status: 'failed',
        artistRevealed: true,
      },
    });
  });

  it('reveals only an active game', () => {
    const playing: GameState = {
      guesses: ['one'],
      status: 'playing',
      artistRevealed: false,
    };
    const revealed = revealSong(playing);

    expect(revealed).toEqual({
      guesses: ['one'],
      status: 'revealed',
      artistRevealed: false,
    });
    expect(revealed).not.toBe(playing);
    expect(revealed.guesses).not.toBe(playing.guesses);

    for (const status of ['solved', 'revealed', 'failed'] as const) {
      const terminal: GameState = {
        guesses: ['one'],
        status,
        artistRevealed: false,
      };
      expect(revealSong(terminal)).toBe(terminal);
    }
  });

  it('preserves an artist reveal through revealSong', () => {
    const playing: GameState = {
      guesses: ['one'],
      status: 'playing',
      artistRevealed: true,
    };

    expect(revealSong(playing)).toEqual({
      guesses: ['one'],
      status: 'revealed',
      artistRevealed: true,
    });
  });

  it('treats submissions in terminal states as no-ops', () => {
    for (const status of ['solved', 'revealed', 'failed'] as const) {
      const state: GameState = {
        guesses: ['hey jude'],
        status,
        artistRevealed: false,
      };

      expect(submitGuess(state, 'anything', solution, GAME_RULES)).toEqual({
        kind: 'invalid',
        reason: 'not-playing',
      });
      expect(state).toEqual({
        guesses: ['hey jude'],
        status,
        artistRevealed: false,
      });
    }
  });

  it('does not mutate the supplied state or guesses', () => {
    const state: GameState = {
      guesses: ['first wrong answer'],
      status: 'playing',
      artistRevealed: false,
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
      artistRevealed: false,
    });
    expect(result.kind).toBe('recorded');
    if (result.kind === 'recorded') {
      expect(result.state).not.toBe(state);
      expect(result.state.guesses).not.toBe(state.guesses);
    }
  });
});

describe('attempt accounting', () => {
  it('counts a reveal toward attempts used and left', () => {
    const state: GameState = {
      guesses: ['one'],
      status: 'playing',
      artistRevealed: true,
    };

    expect(getAttemptsUsed(state, GAME_RULES)).toBe(
      1 + GAME_RULES.artistRevealCost,
    );
    expect(getAttemptsLeft(state, GAME_RULES)).toBe(
      GAME_RULES.maxAttempts - 1 - GAME_RULES.artistRevealCost,
    );
  });

  it('ignores the reveal cost when the artist has not been revealed', () => {
    const state: GameState = {
      guesses: ['one', 'two'],
      status: 'playing',
      artistRevealed: false,
    };

    expect(getAttemptsUsed(state, GAME_RULES)).toBe(2);
    expect(getAttemptsLeft(state, GAME_RULES)).toBe(
      GAME_RULES.maxAttempts - 2,
    );
  });
});

describe('revealArtist', () => {
  it('reveals the artist while playing with attempts to spare', () => {
    const state = createInitialGameState();
    const revealed = revealArtist(state, GAME_RULES);

    expect(revealed).toEqual({
      guesses: [],
      status: 'playing',
      artistRevealed: true,
    });
    expect(revealed).not.toBe(state);
    expect(revealed.guesses).not.toBe(state.guesses);
  });

  it('reveals when exactly the reveal cost plus one attempt remains', () => {
    const rules: GameRules = {
      maxAttempts: 5,
      maxAnswerLength: GAME_RULES.maxAnswerLength,
      artistRevealCost: 2,
    };
    // 5 - 2 (guesses used) = 3 remaining, one more than the cost.
    const state: GameState = {
      guesses: ['a', 'b'],
      status: 'playing',
      artistRevealed: false,
    };

    expect(revealArtist(state, rules)).toEqual({
      guesses: ['a', 'b'],
      status: 'playing',
      artistRevealed: true,
    });
  });

  it.each([
    { remaining: 2, guesses: ['a', 'b', 'c'] },
    { remaining: 1, guesses: ['a', 'b', 'c', 'd'] },
  ])(
    'refuses to reveal when only $remaining attempts remain',
    ({ guesses }) => {
      const state: GameState = {
        guesses,
        status: 'playing',
        artistRevealed: false,
      };

      const result = revealArtist(state, GAME_RULES);

      expect(result).toBe(state);
    },
  );

  it('is a no-op once the artist has already been revealed', () => {
    const state: GameState = {
      guesses: [],
      status: 'playing',
      artistRevealed: true,
    };

    expect(revealArtist(state, GAME_RULES)).toBe(state);
  });

  it('refuses to reveal in every terminal state', () => {
    for (const status of ['solved', 'revealed', 'failed'] as const) {
      const state: GameState = {
        guesses: ['hey jude'],
        status,
        artistRevealed: false,
      };

      expect(revealArtist(state, GAME_RULES)).toBe(state);
    }
  });
});
