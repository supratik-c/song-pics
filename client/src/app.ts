import {
  revealSong,
  submitGuess,
} from './domain/game.ts';
import { GAME_RULES } from './domain/gameConfig.ts';
import type { BuildPuzzleUrl } from './domain/navigation.ts';
import { getPuzzlePerformance } from './domain/performance.ts';
import type { SupportTrigger } from './domain/supportTriggers.ts';
import {
  FuturePuzzleError,
  type GameState,
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchive,
} from './domain/types.ts';
import type { HowToPlayManifest } from './content/howToPlayLoader.ts';
import type { CompletionSource } from './platform/completion.ts';
import type { GameElements } from './platform/dom.ts';
import {
  createModalController,
  renderModalMessage,
  type ModalController,
} from './platform/modal.ts';
import {
  createPuzzleShareRequest,
  type PuzzleShareRequestFactory,
  type ShareGateway,
} from './platform/share.ts';
import type {
  GameStateStore,
  YouTubeConsentStore,
} from './platform/storage.ts';
import { runAfterTactileActivation } from './platform/tactileAction.ts';
import {
  renderArchiveContent,
} from './views/archiveView.ts';
import { renderHowToPlayContent } from './views/howToPlayView.ts';
import { renderLoadingIndicator } from './views/loadingView.ts';
import {
  clearGuessValidation,
  renderArtistHint,
  renderFuturePuzzle,
  renderGuessValidation,
  renderPuzzle,
  renderState,
} from './views/puzzleView.ts';
import {
  clearResult,
  focusCompletedResult,
  renderResult,
} from './views/resultView.ts';
import { renderShareControl } from './views/shareView.ts';
import { renderSupportPrompt } from './views/supportView.ts';

export type AppDependencies = {
  loadPuzzle: (requestedPuzzleId: string | null) => Promise<LoadedPuzzle>;
  loadHowToPlay: () => Promise<HowToPlayManifest>;
  gameStateStore: GameStateStore;
  youtubeConsentStore: YouTubeConsentStore;
  completionSource: CompletionSource;
  buildPuzzleUrl: BuildPuzzleUrl;
  buildPuzzleShareUrl: (puzzleId: string) => string;
  shareGateway: ShareGateway;
  navigateToPuzzle: (url: string) => void;
  supportTrigger: SupportTrigger;
  supportUrl: string;
};

export async function initApp(
  elements: GameElements,
  requestedPuzzleId: string | null,
  dependencies: AppDependencies,
): Promise<void> {
  let puzzle: Puzzle;
  let archive: PuzzleArchive;
  const modal = createModalController(elements.modal);

  elements.howToPlayButton.addEventListener('click', () => {
    runAfterTactileActivation(elements.howToPlayButton, () => {
      void handleHowToPlay(elements, modal, dependencies);
    });
  });

  try {
    ({ puzzle, archive } = await dependencies.loadPuzzle(requestedPuzzleId));
  } catch (error) {
    if (error instanceof FuturePuzzleError) {
      renderFuturePuzzle(elements);
      bindArchiveButton(elements, error.archive, modal, dependencies);
      return;
    }

    throw error;
  }

  let state = dependencies.gameStateStore.load(puzzle.id);
  const solvedPuzzleIds = new Set(
    await dependencies.completionSource.loadSolvedPuzzleIds(
      archive.entries.map((entry) => entry.id),
    ),
  );
  const updateGameState = (): void => {
    if (state.status === 'solved') {
      solvedPuzzleIds.add(puzzle.id);
    }

    renderGameState(elements, puzzle, state, dependencies.youtubeConsentStore);

    const prompt = renderSupportPrompt({
      supportUrl: dependencies.supportUrl,
      shouldRender: () => dependencies.supportTrigger({
        solvedPuzzleCount: solvedPuzzleIds.size,
        status: state.status,
      }),
    });

    elements.supportRegion.replaceChildren(...(prompt ? [prompt] : []));
    elements.supportRegion.hidden = prompt === null;
  };
  const shareUrl = dependencies.buildPuzzleShareUrl(puzzle.id);
  const getShareRequest: PuzzleShareRequestFactory = () => {
    const performance = getPuzzlePerformance(puzzle.id, state);

    if (!performance) {
      throw new Error('Puzzle performance is unavailable during play.');
    }

    return createPuzzleShareRequest(shareUrl, performance);
  };
  const createShareControl = (): HTMLElement => renderShareControl({
    fallbackUrl: shareUrl,
    getRequest: getShareRequest,
    share: dependencies.shareGateway.share,
  });

  elements.shareRegion.replaceChildren(createShareControl());

  bindArchiveButton(elements, archive, modal, dependencies);
  await renderPuzzle(elements, puzzle);
  updateGameState();

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearGuessValidation(elements);

    const rawGuess = String(
      new FormData(elements.form).get('guess') ?? '',
    );
    const submission = submitGuess(state, rawGuess, puzzle, GAME_RULES);

    if (submission.kind === 'invalid') {
      renderGuessValidation(elements, submission.reason, GAME_RULES);
      return;
    }

    const applySubmission = (): void => {
      state = submission.state;
      dependencies.gameStateStore.save(puzzle.id, state);
      elements.form.reset();
      updateGameState();

      if (state.status === 'playing') {
        elements.guessInput.focus();
      } else {
        focusCompletedResult(elements.resultRegion);
      }
    };

    if (submission.state.status === 'playing') {
      applySubmission();
    } else {
      runAfterTactileActivation(elements.submitButton, applySubmission);
    }
  });

  elements.revealArtistButton.addEventListener('click', () => {
    runAfterTactileActivation(elements.revealArtistButton, () => {
      if (state.status === 'playing') {
        renderArtistHint(elements, puzzle.artist);
      }
    });
  });

  elements.revealSongButton.addEventListener('click', () => {
    runAfterTactileActivation(elements.revealSongButton, () => {
      if (state.status !== 'playing') {
        return;
      }

      state = revealSong(state);
      dependencies.gameStateStore.save(puzzle.id, state);
      clearGuessValidation(elements);
      updateGameState();
      focusCompletedResult(elements.resultRegion);
    });
  });
}

function renderGameState(
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
  youtubeConsentStore: YouTubeConsentStore,
): void {
  renderState(elements, state, GAME_RULES, puzzle.lyricLines);

  if (state.status === 'playing') {
    clearResult(elements.resultRegion);
    return;
  }

  renderResult(elements.resultRegion, puzzle, state.status, {
    hasConsent: youtubeConsentStore.hasConsent(),
    grantConsent: youtubeConsentStore.grant,
  });
}

async function handleHowToPlay(
  elements: GameElements,
  modal: ModalController,
  dependencies: AppDependencies,
): Promise<void> {
  const viewId = modal.open({
    title: 'How to Play',
    content: renderLoadingIndicator(),
    returnFocus: elements.howToPlayButton,
    busy: true,
  });

  try {
    const manifest = await dependencies.loadHowToPlay();

    modal.update(viewId, {
      title: manifest.title,
      content: renderHowToPlayContent(manifest),
      busy: false,
    });
  } catch (error) {
    console.error(error);
    modal.update(viewId, {
      content: renderModalMessage(
        'The instructions have wandered off. Please close this box and try again.',
        'error',
      ),
      busy: false,
    });
  }
}

function bindArchiveButton(
  elements: GameElements,
  archive: PuzzleArchive,
  modal: ModalController,
  dependencies: AppDependencies,
): void {
  elements.allReleasesButton.disabled = archive.entries.length === 0;

  elements.allReleasesButton.addEventListener('click', () => {
    runAfterTactileActivation(elements.allReleasesButton, () => {
      const viewId = modal.open({
        title: 'All Releases',
        content: renderLoadingIndicator(),
        returnFocus: elements.allReleasesButton,
        busy: true,
      });

      const selectPuzzle = (url: string): void => {
        if (!modal.showBusyOverlay(viewId, renderLoadingIndicator())) {
          return;
        }

        window.addEventListener('pagehide', () => modal.close(), {
          once: true,
        });
        dependencies.navigateToPuzzle(url);
      };

      void dependencies.completionSource.loadCompletedPuzzleIds(
        archive.entries.map((entry) => entry.id),
      ).then((completedPuzzleIds) => {
        modal.update(viewId, {
          content: renderArchiveContent(
            archive,
            completedPuzzleIds,
            dependencies.buildPuzzleUrl,
            selectPuzzle,
          ),
          busy: false,
        });
      }).catch((error) => {
        console.error(error);
        modal.update(viewId, {
          content: renderArchiveContent(
            archive,
            new Set(),
            dependencies.buildPuzzleUrl,
            selectPuzzle,
          ),
          busy: false,
        });
      });
    });
  });
}
