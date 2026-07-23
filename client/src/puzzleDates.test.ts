import { describe, expect, it } from 'vitest';
import dateFixtureData from '../fixtures/date-behavior.json';
import {
  formatPuzzleDisplayDate,
  isFuturePuzzleDateId,
  isPuzzleDateId,
} from './puzzleDates.ts';

type DateFixture = {
  validityCases: Array<{
    name: string;
    puzzleId: string;
    valid: boolean;
  }>;
  releaseCases: Array<{
    name: string;
    puzzleId: string;
    today: string;
    future: boolean;
  }>;
};

const dateFixture = dateFixtureData as DateFixture;

describe('puzzle date IDs', () => {
  for (const testCase of dateFixture.validityCases) {
    it(testCase.name, () => {
      expect(isPuzzleDateId(testCase.puzzleId)).toBe(testCase.valid);
    });
  }

  it('formats a valid puzzle ID without timezone conversion', () => {
    expect(formatPuzzleDisplayDate('2024-02-29')).toBe('29 February 2024');
  });

  it('rejects formatting an invalid puzzle ID', () => {
    expect(() => formatPuzzleDisplayDate('2025-02-29')).toThrow(
      'Invalid puzzle date id: 2025-02-29',
    );
  });
});

describe('future puzzle checks', () => {
  for (const testCase of dateFixture.releaseCases) {
    it(testCase.name, () => {
      const injectedClock = new Date(`${testCase.today}T12:00:00`);

      expect(
        isFuturePuzzleDateId(testCase.puzzleId, injectedClock),
      ).toBe(testCase.future);
    });
  }
});
