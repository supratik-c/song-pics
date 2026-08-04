import { describe, expect, it } from 'vitest';
import dateFixtureData from '../../fixtures/date-behavior.json';
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

  it.each([
    ['2026-01-03', '3 Jan 26'],
    ['2024-02-29', '29 Feb 24'],
    ['2000-07-18', '18 Jul 00'],
    ['2001-09-12', '12 Sep 01'],
  ])('formats %s as %s without timezone conversion', (dateId, expected) => {
    expect(formatPuzzleDisplayDate(dateId)).toBe(expected);
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
