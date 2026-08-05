import { describe, expect, it } from 'vitest';
import {
  alwaysShowSupport,
  neverShowSupport,
  whenSolvedAtLeast,
  type SupportTriggerContext,
} from './supportTriggers.ts';

function context(solvedPuzzleCount: number): SupportTriggerContext {
  return { solvedPuzzleCount, status: 'solved' };
}

describe('support triggers', () => {
  it('never shows the support prompt', () => {
    expect(neverShowSupport(context(0))).toBe(false);
    expect(neverShowSupport(context(100))).toBe(false);
  });

  it('always shows the support prompt', () => {
    expect(alwaysShowSupport(context(0))).toBe(true);
  });

  it.each([
    [0, false],
    [2, false],
    [3, true],
    [4, true],
  ])('whenSolvedAtLeast(3) with %i solved returns %s', (solvedPuzzleCount, expected) => {
    expect(whenSolvedAtLeast(3)(context(solvedPuzzleCount))).toBe(expected);
  });

  it('is independent of game status', () => {
    const trigger = whenSolvedAtLeast(1);

    expect(trigger({ solvedPuzzleCount: 1, status: 'playing' })).toBe(true);
    expect(trigger({ solvedPuzzleCount: 1, status: 'failed' })).toBe(true);
  });
});
