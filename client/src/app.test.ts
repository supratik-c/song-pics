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
      artistRevealed: false,
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
  it('reveals the artist for a cost of 2 guesses while playing', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();

    expect(elements.artistHint.hidden).toBe(false);
    expect(elements.artistHint.textContent).toBe(puzzle.artist);
    expect(elements.attemptsCount.textContent).toBe('3 guesses left');
    expect(dependencies.gameStateStore.save).toHaveBeenCalledWith(puzzle.id, {
      guesses: [],
      status: 'playing',
      artistRevealed: true,
    });

    const penalty = elements.attemptsCell.querySelector('.attempts-penalty');

    expect(penalty?.textContent).toBe('−2');
    expect(document.activeElement).toBe(elements.artistHint);
  });

  it('disables the reveal button once fewer than 3 guesses remain', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);

    for (const guess of ['wrong one', 'wrong two', 'wrong three']) {
      elements.guessInput.value = guess;
      elements.form.dispatchEvent(new Event('submit', { cancelable: true }));
    }

    expect(elements.attemptsCount.textContent).toBe('2 guesses left');
    expect(elements.revealArtistButton.disabled).toBe(true);
    expect(elements.revealArtistButton.textContent).toContain(
      'Not enough guesses!',
    );

    elements.revealArtistButton.click();

    expect(elements.artistHint.hidden).toBe(true);
    expect(dependencies.gameStateStore.save).not.toHaveBeenCalledWith(
      puzzle.id,
      expect.objectContaining({ artistRevealed: true }),
    );
  });

  it('does not replay the reveal or its penalty flourish for a restored puzzle', async () => {
    const elements = createElements();
    let state: GameState = {
      guesses: ['one'],
      status: 'playing',
      artistRevealed: true,
    };
    const dependencies = createDependencies({
      gameStateStore: {
        load: vi.fn(() => state),
        save: vi.fn((_puzzleId: string, nextState: GameState) => {
          state = nextState;
        }),
      },
    });

    await initApp(elements, null, dependencies);

    expect(elements.artistHint.hidden).toBe(false);
    expect(elements.artistHint.textContent).toBe(puzzle.artist);
    expect(
      elements.attemptsCell.querySelector('.attempts-penalty'),
    ).toBeNull();
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
      artistRevealed: false,
    });
    expect(elements.resultRegion.hidden).toBe(false);
    expect(
      elements.resultRegion.querySelector('.result-answer')?.textContent,
    ).toBe(puzzle.songTitle);
    expect(
      elements.resultRegion.querySelector('.result-artist')?.textContent,
    ).toBe(`by ${puzzle.artist}`);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});

describe('reveal-artist notice', () => {
  it('opens the popover instead of revealing on the very first click', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();

    const dialog = document.querySelector<HTMLDialogElement>(
      'dialog.artist-reveal-notice',
    );

    expect(dialog).not.toBeNull();
    expect(dialog?.open).toBe(true);
    expect(elements.artistHint.hidden).toBe(true);
    expect(dependencies.gameStateStore.save).not.toHaveBeenCalled();
  });

  it('reveals, marks the notice seen, and shows the flourish when Accept is pressed', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();
    document
      .querySelector<HTMLButtonElement>('.artist-reveal-notice-accept')
      ?.click();

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(artistRevealNoticeStore.markSeen).toHaveBeenCalledTimes(1);
    expect(elements.artistHint.hidden).toBe(false);
    expect(elements.artistHint.textContent).toBe(puzzle.artist);
    expect(elements.attemptsCount.textContent).toBe('3 guesses left');
    expect(
      elements.attemptsCell.querySelector('.attempts-penalty')?.textContent,
    ).toBe('−2');
    expect(document.activeElement).toBe(elements.artistHint);
  });

  it('a commit lock prevents Escape from dropping a pending Accept during its tactile delay', async () => {
    // This race only exists when runAfterTactileActivation actually defers
    // (reduced motion, mocked true in beforeEach, takes the synchronous
    // branch instead) — override it and use fake timers to reach the
    // ~250ms fallback-timer window the race lives in.
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    vi.useFakeTimers();

    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();
    // Opening the popover is itself deferred behind the tactile delay now
    // that reduced motion is off; run it to completion before interacting
    // with the popover's own buttons.
    vi.runAllTimers();

    const acceptButton = document.querySelector<HTMLButtonElement>(
      '.artist-reveal-notice-accept',
    );
    acceptButton?.click();

    // The Accept action is still pending behind its own tactile delay.
    const dialog = document.querySelector<HTMLDialogElement>(
      'dialog.artist-reveal-notice',
    );

    expect(dialog).not.toBeNull();
    expect(artistRevealNoticeStore.markSeen).not.toHaveBeenCalled();

    // Escape lands inside the pending window — the commit lock (set
    // synchronously on click, before the delay) must make this a no-op.
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(document.querySelector('dialog.artist-reveal-notice')).not.toBeNull();
    expect(artistRevealNoticeStore.markSeen).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(artistRevealNoticeStore.markSeen).toHaveBeenCalledTimes(1);
    expect(elements.artistHint.hidden).toBe(false);
    expect(elements.artistHint.textContent).toBe(puzzle.artist);

    vi.useRealTimers();
  });

  it('marks the notice seen without revealing when Decline is pressed', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();
    document
      .querySelector<HTMLButtonElement>('.artist-reveal-notice-decline')
      ?.click();

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(artistRevealNoticeStore.markSeen).toHaveBeenCalledTimes(1);
    expect(elements.artistHint.hidden).toBe(true);
    expect(dependencies.gameStateStore.save).not.toHaveBeenCalled();
  });

  it('behaves as decline when the popover is dismissed via Escape', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();

    const dialog = document.querySelector<HTMLDialogElement>(
      'dialog.artist-reveal-notice',
    );
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(artistRevealNoticeStore.markSeen).toHaveBeenCalledTimes(1);
    expect(elements.artistHint.hidden).toBe(true);
  });

  it('behaves as decline when the popover backdrop area is clicked', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();

    const dialog = document.querySelector<HTMLDialogElement>(
      'dialog.artist-reveal-notice',
    );
    dialog?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(artistRevealNoticeStore.markSeen).toHaveBeenCalledTimes(1);
    expect(elements.artistHint.hidden).toBe(true);
  });

  it('reveals directly with no popover on the click after a decline', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();
    document
      .querySelector<HTMLButtonElement>('.artist-reveal-notice-decline')
      ?.click();

    elements.revealArtistButton.click();

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(elements.artistHint.hidden).toBe(false);
    expect(elements.artistHint.textContent).toBe(puzzle.artist);
  });

  it('focuses the popover container itself, not a button inside it', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();

    const dialog = document.querySelector('dialog.artist-reveal-notice');

    expect(document.activeElement).toBe(dialog);
  });

  it('returns focus to the Reveal Artist button after the popover closes', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);
    elements.revealArtistButton.click();
    document
      .querySelector<HTMLButtonElement>('.artist-reveal-notice-decline')
      ?.click();

    expect(document.activeElement).toBe(elements.revealArtistButton);
  });

  it('does not open the notice or mark it seen when the reveal is unaffordable', async () => {
    const elements = createElements();
    const artistRevealNoticeStore = createArtistRevealNoticeStore(false);
    const dependencies = createDependencies({ artistRevealNoticeStore });

    await initApp(elements, null, dependencies);

    for (const guess of ['wrong one', 'wrong two', 'wrong three']) {
      elements.guessInput.value = guess;
      elements.form.dispatchEvent(new Event('submit', { cancelable: true }));
    }

    elements.revealArtistButton.click();

    expect(document.querySelector('dialog.artist-reveal-notice')).toBeNull();
    expect(artistRevealNoticeStore.hasSeen).not.toHaveBeenCalled();
    expect(artistRevealNoticeStore.markSeen).not.toHaveBeenCalled();
  });
});

describe('support prompt', () => {
  it('stays hidden and empty when the support trigger returns false', async () => {
    const elements = createElements();
    const dependencies = createDependencies();

    await initApp(elements, null, dependencies);
    elements.guessInput.value = 'A Song';
    elements.form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(elements.supportRegion.hidden).toBe(true);
    expect(elements.supportRegion.textContent).toBe('');
  });

  it('renders the heading and link when the support trigger returns true', async () => {
    const elements = createElements();
    const dependencies = createDependencies({
      supportTrigger: vi.fn(() => true),
      supportUrl: 'https://ko-fi.com/scribblebops',
    });

    await initApp(elements, null, dependencies);

    expect(elements.supportRegion.hidden).toBe(false);
    expect(elements.supportRegion.textContent).toContain(
      'Like Scribble Bops? Buy us a',
    );

    const link = elements.supportRegion.querySelector<HTMLAnchorElement>(
      '.support-link',
    );

    expect(link?.href).toBe('https://ko-fi.com/scribblebops');
  });

  it('counts a puzzle solved this session toward the trigger without waiting for reload', async () => {
    const elements = createElements();
    const supportTrigger = vi.fn(() => false);
    const dependencies = createDependencies({
      completionSource: {
        loadCompletedPuzzleIds: vi.fn().mockResolvedValue(new Set()),
        loadSolvedPuzzleIds: vi.fn().mockResolvedValue(
          new Set(['2026-07-21', '2026-07-22']),
        ),
      },
      supportTrigger,
    });

    await initApp(elements, null, dependencies);

    expect(supportTrigger).toHaveBeenLastCalledWith({
      solvedPuzzleCount: 2,
      status: 'playing',
    });

    elements.guessInput.value = 'A Song';
    elements.form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(supportTrigger).toHaveBeenLastCalledWith({
      solvedPuzzleCount: 3,
      status: 'solved',
    });
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
        loadSolvedPuzzleIds: vi.fn().mockResolvedValue(new Set()),
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

// Stateful (unlike createDependencies' default "already seen" fake) so
// hasSeen reflects a real markSeen call — "the click after the popover
// behaves differently" is the exact thing these tests exercise.
function createArtistRevealNoticeStore(seen: boolean): {
  hasSeen: ReturnType<typeof vi.fn<() => boolean>>;
  markSeen: ReturnType<typeof vi.fn<() => void>>;
} {
  let hasSeenFlag = seen;

  return {
    hasSeen: vi.fn(() => hasSeenFlag),
    markSeen: vi.fn(() => {
      hasSeenFlag = true;
    }),
  };
}

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
      loadSolvedPuzzleIds: vi.fn().mockResolvedValue(new Set()),
    },
    // Defaults to "already seen" so every existing reveal/attempts test
    // keeps exercising today's direct-reveal path unchanged; the
    // 'reveal-artist notice' describe block below overrides this with a
    // stateful fake to exercise the once-ever popover itself.
    artistRevealNoticeStore: {
      hasSeen: vi.fn(() => true),
      markSeen: vi.fn(),
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
    supportTrigger: vi.fn(() => false),
    supportUrl: 'https://ko-fi.com/test',
    ...overrides,
  };
}
