import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isSupportedYouTubeUrl,
  normalizePuzzleAnswer,
  parsePuzzleJson,
  validatePuzzleJson,
} from './puzzleValidation.mjs';

const answerFixture = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../fixtures/answer-normalization.json'),
    'utf8',
  ),
);

const validPuzzle = {
  songClue: 'A clue',
  songTitle: 'Dog Days Are Over',
  artist: 'Florence and The Machine',
  acceptedAnswers: ['Dog Days Are Over', 'Dog Days'],
  youtubeURL: 'https://www.youtube.com/watch?v=iWOyfLBYtuU',
};

describe('build-side answer normalization', () => {
  it.each(answerFixture.normalizationCases)(
    '$name',
    ({ input, artist, expected }) => {
      expect(normalizePuzzleAnswer(input, artist)).toEqual(expected);
    },
  );
});

describe('authored puzzle validation', () => {
  it('returns valid puzzle data', () => {
    expect(validatePuzzleJson(validPuzzle)).toBe(validPuzzle);
  });

  it('reports malformed JSON with its source path', () => {
    expect(() => parsePuzzleJson('{', '/puzzles/bad/puzzle.json')).toThrow(
      'Puzzle contains invalid JSON: /puzzles/bad/puzzle.json',
    );
  });

  it.each(['songClue', 'songTitle', 'artist'])(
    'rejects an empty %s',
    (field) => {
      expect(() => validatePuzzleJson({
        ...validPuzzle,
        [field]: '   ',
      })).toThrow(`${field} must be a non-empty string`);
    },
  );

  it('rejects an empty accepted-answer list', () => {
    expect(() => validatePuzzleJson({
      ...validPuzzle,
      acceptedAnswers: [],
    })).toThrow('acceptedAnswers must be a non-empty array');
  });

  it('requires the canonical title after normalization', () => {
    expect(() => validatePuzzleJson({
      ...validPuzzle,
      acceptedAnswers: ['Dog Days'],
    })).toThrow('acceptedAnswers must include the canonical songTitle');
  });

  it('rejects answers duplicated after normalization', () => {
    expect(() => validatePuzzleJson({
      ...validPuzzle,
      acceptedAnswers: ['Dog Days Are Over', 'dog-days are over'],
    })).toThrow('duplicates acceptedAnswers[0] after normalization');
  });

  it('validates explicit panel entries when present', () => {
    expect(() => validatePuzzleJson({
      ...validPuzzle,
      panels: [{ src: '' }],
    })).toThrow('panels[0].src must be a non-empty string');
  });
});

describe('YouTube URL validation', () => {
  it.each([
    'https://youtu.be/iWOyfLBYtuU',
    'https://youtube.com/watch?v=iWOyfLBYtuU',
    'https://www.youtube.com/embed/iWOyfLBYtuU',
  ])('accepts %s', (url) => {
    expect(isSupportedYouTubeUrl(url)).toBe(true);
  });

  it.each([
    'not a URL',
    'https://example.com/watch?v=iWOyfLBYtuU',
    'https://youtube.com/watch',
    'https://youtu.be/',
  ])('rejects %s', (url) => {
    expect(isSupportedYouTubeUrl(url)).toBe(false);
  });
});
