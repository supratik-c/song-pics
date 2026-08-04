import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initApp, type AppDependencies } from './app.ts';
import { createInitialGameState } from './domain/game.ts';
import {
  FuturePuzzleError,
  type GameState,
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchive,
} from './domain/types.ts';
import { getGameElements } from './platform/dom.ts';
import { loadAppShellIntoDocument } from './testSupport.ts';

const puzzle: Puzzle = {
  id: '2026-07-23',
  displayDate: '23 Jul 26',
  issueNumber: 3,
  songClue: 'A clue without spoilers',
  // Panel image loading is exercised in views/puzzleView.test.ts; an empty
  // set keeps this file focused on orchestration, not image decoding.
  panels: [],
  songTitle: 'A Song',
  artist: 'An Artist',
  acceptedAnswers: ['A Song'],
};

const archive: PuzzleArchive = {
  entries: [
    { id: puzzle.id, issueNumber: puzzle.issueNumber, songClue: puzzle.songClue },
  ],
  latestPuzzleId: puzzle.id,
  selectedPuzzleId: puzzle.id,
};

beforeEach(() => {
  // Every reveal/submit path runs its DOM update through
  // runAfterTactileActivation, which otherwise waits for a CSS animation
  // event that never fires in a headless test. Reduced motion takes the
  // same synchronous branch a real user with that preference gets.
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true,
  } as MediaQueryList);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('future puzzle handling', () => {
  it('renders the future-puzzle screen without starting the game', async () => {
    const elements = createElements();
    const futureArchive: PuzzleArchive = {
      entries: [],
      latestPuzzleId: puzzle.id,
      selectedPuzzleId: '2026-08-05',
    };
    const dependencies = createDependencies({
      loadPuzzle: vi.fn().mockRejectedValue(
        new FuturePuzzleError('2026-08-05', futureArchive),
      ),
    });

    await initApp(elements, '2026-08-05', dependencies);

    expect(elements.panels.textContent).toContain('Still in development');
    expect(elements.allReleasesButton.disabled).toBe(true);
    expect(dependencies.gameStateStore.load).not.toHaveBeenCalled();
  });
});

describe('puzzle loading', () => {
  it('renders the puzzle and mounts a working share control', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);

    expect(elements.songClue.textContent).toBe(puzzle.songClue);
    expect(elements.allReleasesButton.disabled).toBe(false);
    expect(dependencies.buildPuzzleShareUrl).toHaveBeenCalledWith(puzzle.id);

    const shareButton = elements.shareRegion.querySelector<HTMLButtonElement>(
      '.share-button',
    );

    expect(shareButton).not.toBeNull();
  });
});

describe('guess submission', () => {
  it('records a valid guess and keeps focus on the input while play continues', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);

    elements.guessInput.value = 'a wrong guess';
    elements.form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(dependencies.gameStateStore.save).toHaveBeenCalledWith(puzzle.id, {
      guesses: ['a wrong guess'],
      status: 'playing',
    });
    expect(elements.guessList.children).toHaveLength(1);
    expect(elements.attemptsCount.textContent).toBe('4 guesses left');
    expect(elements.guessInput.value).toBe('');
  });

  it('shows a validation message for an empty guess without consuming an attempt', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);

    elements.guessInput.value = '   ';
    elements.form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(elements.validationMessage.hidden).toBe(false);
    expect(elements.validationMessage.textContent).toBe(
      'Please enter an answer containing letters or numbers.',
    );
    expect(dependencies.gameStateStore.save).not.toHaveBeenCalled();
  });
});

describe('artist and song reveal', () => {
  it('reveals the artist only while the puzzle is still being played', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();

    expect(elements.artistHint.hidden).toBe(false);
    expect(elements.artistHint.textContent).toBe(puzzle.artist);
  });

  it('ignores an artist reveal once the round has ended', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);
    elements.revealSongButton.click();
    elements.revealArtistButton.click();

    expect(elements.artistHint.hidden).toBe(true);
  });

  it('reveals the song, persists the terminal state, and focuses the result', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);

    const focusSpy = vi.spyOn(elements.resultRegion, 'focus');

    elements.revealSongButton.click();

    expect(dependencies.gameStateStore.save).toHaveBeenCalledWith(puzzle.id, {
      guesses: [],
      status: 'revealed',
    });
    expect(elements.resultRegion.hidden).toBe(false);
    expect(
      elements.resultRegion.querySelector('.result-answer')?.textContent,
    ).toBe(`${puzzle.songTitle} by ${puzzle.artist}`);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});

describe('How to Play modal', () => {
  it('opens the modal and renders the loaded manifest', async () => {
    const elements = createElements();
    const manifest = {
      title: 'How to Play',
      introduction: 'Decode the drawings.',
      sections: [{ heading: 'Look', body: 'Study every panel.' }],
      demo: {
        clue: 'A clue',
        panels: [],
        answer: 'A Song',
        artist: 'An Artist',
      },
    };
    const dependencies = createDependencies({
      loadHowToPlay: vi.fn().mockResolvedValue(manifest),
    });

    await initApp(elements, null, dependencies);
    elements.howToPlayButton.click();

    await vi.waitFor(() => {
      expect(elements.modal.title.textContent).toBe('How to Play');
    });

    expect(elements.modal.dialog.open).toBe(true);
    expect(
      elements.modal.body.querySelector('.how-to-demo-answer')?.textContent,
    ).toBe('Answer: A Song by An Artist');
  });

  it('shows an error message when loading fails', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      loadHowToPlay: vi.fn().mockRejectedValue(new Error('network down')),
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    await initApp(elements, null, dependencies);
    elements.howToPlayButton.click();

    await vi.waitFor(() => {
      expect(
        elements.modal.body.querySelector('.dialog-message-error'),
      ).not.toBeNull();
    });
  });
});

describe('All Releases modal', () => {
  it('opens the modal and marks completed puzzles', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      completionSource: {
        loadCompletedPuzzleIds: vi.fn().mockResolvedValue(new Set([puzzle.id])),
      },
    });

    await initApp(elements, null, dependencies);
    elements.allReleasesButton.click();

    await vi.waitFor(() => {
      expect(elements.modal.title.textContent).toBe('All Releases');
    });

    expect(
      elements.modal.body.querySelector('.archive-badge-completed'),
    ).not.toBeNull();
  });
});

function createElements(): ReturnType<typeof getGameElements> {
  loadAppShellIntoDocument();
  return getGameElements();
}

function createDependencies(
  overrides: Partial<AppDependencies> = {},
): AppDependencies {
  let state: GameState = createInitialGameState();

  return {
    loadPuzzle: vi.fn().mockResolvedValue(
      { puzzle, archive } satisfies LoadedPuzzle,
    ),
    loadHowToPlay: vi.fn(),
    gameStateStore: {
      load: vi.fn(() => state),
      save: vi.fn((_puzzleId: string, nextState: GameState) => {
        state = nextState;
      }),
    },
    youtubeConsentStore: {
      hasConsent: vi.fn(() => false),
      grant: vi.fn(),
    },
    completionSource: {
      loadCompletedPuzzleIds: vi.fn().mockResolvedValue(new Set()),
    },
    buildPuzzleUrl: vi.fn(
      (puzzleId: string) => `https://example.test/?puzzle=${puzzleId}`,
    ),
    buildPuzzleShareUrl: vi.fn(
      (puzzleId: string) => `https://example.test/share/${puzzleId}/`,
    ),
    shareGateway: {
      preferredAction: 'copy',
      share: vi.fn().mockResolvedValue('copied'),
    },
    navigateToPuzzle: vi.fn(),
    ...overrides,
  };
}
