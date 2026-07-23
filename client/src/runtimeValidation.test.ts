import { describe, expect, it } from 'vitest';
import { isBuildVersionManifest } from './deploymentVersion.ts';
import { isHowToPlayManifest } from './howToPlayLoader.ts';
import {
  isPuzzleIndex,
  isPuzzleJson,
  isPuzzlePanelsManifest,
} from './puzzleLoader.ts';

const validPuzzle = {
  songClue: 'A useful clue',
  songTitle: 'Hey Jude',
  artist: 'The Beatles',
  acceptedAnswers: ['Hey Jude'],
  youtubeURL: 'https://www.youtube.com/watch?v=A_MjCqQoLLA',
};

const validHowToPlay = {
  title: 'How to Play',
  introduction: 'Decode the doodles.',
  sections: [
    { heading: 'Look', body: 'Study each panel.' },
  ],
  demo: {
    clue: 'A practice clue',
    panels: [{ src: '1.webp', alt: 'A neutral practice drawing' }],
    answer: 'Practice Song',
    artist: 'Practice Artist',
  },
};

describe('puzzle runtime guards', () => {
  it('accepts a complete puzzle with inferred panels', () => {
    expect(isPuzzleJson(validPuzzle)).toBe(true);
  });

  it('accepts valid explicit panels', () => {
    expect(
      isPuzzleJson({
        ...validPuzzle,
        panels: [{ src: '1.webp' }, { src: 'nested/2.png' }],
      }),
    ).toBe(true);
  });

  it.each([
    null,
    {},
    { ...validPuzzle, songClue: '   ' },
    { ...validPuzzle, songTitle: 42 },
    { ...validPuzzle, artist: '' },
    { ...validPuzzle, acceptedAnswers: [] },
    { ...validPuzzle, acceptedAnswers: ['Hey Jude', ''] },
    { ...validPuzzle, youtubeURL: '' },
    { ...validPuzzle, panels: [] },
    { ...validPuzzle, panels: [{ src: '' }] },
  ])('rejects malformed puzzle data %#', (value) => {
    expect(isPuzzleJson(value)).toBe(false);
  });

  it('accepts a valid panel manifest', () => {
    expect(
      isPuzzlePanelsManifest({
        '2024-02-29': [{ src: '1.webp' }, { src: '3.png' }],
      }),
    ).toBe(true);
  });

  it.each([
    [],
    { '2025-02-29': [{ src: '1.webp' }] },
    { '2026-07-23': [] },
    { '2026-07-23': [{ src: '' }] },
    { '2026-07-23': '1.webp' },
  ])('rejects malformed panel manifests %#', (value) => {
    expect(isPuzzlePanelsManifest(value)).toBe(false);
  });

  it('accepts a valid puzzle index', () => {
    expect(
      isPuzzleIndex([
        { id: '2024-02-29', songClue: 'Leap into this one' },
        { id: '2026-07-23', songClue: 'A second clue' },
      ]),
    ).toBe(true);
  });

  it.each([
    {},
    [{ id: '2025-02-29', songClue: 'Impossible' }],
    [{ id: '2026-07-23', songClue: '' }],
    [{ id: '2026-07-23' }],
  ])('rejects malformed puzzle indexes %#', (value) => {
    expect(isPuzzleIndex(value)).toBe(false);
  });
});

describe('How to Play runtime guard', () => {
  it('accepts the complete tutorial contract', () => {
    expect(isHowToPlayManifest(validHowToPlay)).toBe(true);
  });

  it.each([
    null,
    { ...validHowToPlay, title: '' },
    { ...validHowToPlay, sections: [] },
    {
      ...validHowToPlay,
      sections: [{ heading: 'Look', body: '' }],
    },
    {
      ...validHowToPlay,
      demo: { ...validHowToPlay.demo, panels: [] },
    },
    {
      ...validHowToPlay,
      demo: {
        ...validHowToPlay.demo,
        panels: [{ src: '../spoiler.webp', alt: 'A panel' }],
      },
    },
    {
      ...validHowToPlay,
      demo: {
        ...validHowToPlay.demo,
        panels: [{ src: '1.webp', alt: '' }],
      },
    },
  ])('rejects malformed tutorial data %#', (value) => {
    expect(isHowToPlayManifest(value)).toBe(false);
  });
});

describe('build-version runtime guard', () => {
  it('accepts a non-empty build ID', () => {
    expect(isBuildVersionManifest({ buildId: 'commit-123' })).toBe(true);
  });

  it.each([
    null,
    {},
    { buildId: '' },
    { buildId: '   ' },
    { buildId: 123 },
  ])('rejects malformed build-version data %#', (value) => {
    expect(isBuildVersionManifest(value)).toBe(false);
  });
});
