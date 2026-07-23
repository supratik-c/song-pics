import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isFuturePuzzleDateId,
  isPuzzleDateId,
} from './puzzleConventions.mjs';

const dateFixture = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../fixtures/date-behavior.json'),
    'utf8',
  ),
);

describe('puzzle date conventions', () => {
  it.each(dateFixture.validityCases)(
    '$name',
    ({ puzzleId, valid }) => {
      expect(isPuzzleDateId(puzzleId)).toBe(valid);
    },
  );

  it.each(dateFixture.releaseCases)(
    '$name',
    ({ puzzleId, today, future }) => {
      expect(
        isFuturePuzzleDateId(puzzleId, toLocalDate(today)),
      ).toBe(future);
    },
  );
});

function toLocalDate(dateId) {
  const [year, month, day] = dateId.split('-').map(Number);

  return new Date(year, month - 1, day, 12);
}
