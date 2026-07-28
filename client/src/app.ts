import type { CompletionSource } from './completion.ts';
import type { GameElements } from './dom.ts';
import {
  revealSong,
  submitGuess,
} from './game.ts';
import { GAME_RULES } from './gameConfig.ts';
import type { HowToPlayManifest } from './howToPlayLoader.ts';
import type { BuildPuzzleUrl } from './navigation.ts';
import { getPuzzlePerformance } from './performance.ts';
import {
  createModalController,
  renderModalMessage,
  type ModalController,
} from './modal.ts';
import type { GameStateStore } from './storage.ts';
import { runAfterTactileActivation } from './tactileAction.ts';
import {
  createPuzzleShareRequest,
  type PuzzleShareRequestFactory,
  type ShareGateway,
} from './share.ts';
import {
  FuturePuzzleError,
  type GameState,
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchive,
} from './types.ts';
import {
  renderArchiveContent,
} from './views/archiveView.ts';
import { renderHowToPlayContent } from './views/howToPlayView.ts';
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

export type AppDependencies = {
  loadPuzzle: (requestedPuzzleId: string | null) => Promise<LoadedPuzzle>;
  loadHowToPlay: () => Promise<HowToPlayManifest>;
  gameStateStore: GameStateStore;
  completionSource: CompletionSource;
  buildPuzzleUrl: BuildPuzzleUrl;
  buildPuzzleShareUrl: (puzzleId: string) => string;
  shareGateway: ShareGateway;
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

  renderPuzzle(elements, puzzle);
  renderGameState(elements, puzzle, state);
  bindArchiveButton(elements, archive, modal, dependencies);

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
      renderGameState(elements, puzzle, state);

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
      renderGameState(elements, puzzle, state);
      focusCompletedResult(elements.resultRegion);
    });
  });
}

function renderGameState(
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
): void {
  renderState(elements, state, GAME_RULES, puzzle.lyricLines);

  if (state.status === 'playing') {
    clearResult(elements.resultRegion);
    return;
  }

  renderResult(elements.resultRegion, puzzle, state.status);
}

async function handleHowToPlay(
  elements: GameElements,
  modal: ModalController,
  dependencies: AppDependencies,
): Promise<void> {
  const viewId = modal.open({
    title: 'How to Play',
    content: renderModalMessage('Sharpening the crayons...'),
    returnFocus: elements.howToPlayButton,
  });

  try {
    const manifest = await dependencies.loadHowToPlay();

    modal.update(viewId, {
      title: manifest.title,
      content: renderHowToPlayContent(manifest),
    });
  } catch (error) {
    console.error(error);
    modal.update(viewId, {
      content: renderModalMessage(
        'The instructions have wandered off. Please close this box and try again.',
        'error',
      ),
    });
  }
}

function bindArchiveButton(
  elements: GameElements,
  archive: PuzzleArchive,
  modal: ModalController,
  dependencies: AppDependencies,
): void {
  elements.allIssuesButton.disabled = archive.entries.length === 0;

  elements.allIssuesButton.addEventListener('click', () => {
    runAfterTactileActivation(elements.allIssuesButton, () => {
      const viewId = modal.open({
        title: 'All Issues',
        content: renderModalMessage('Checking your back catalogue...'),
        returnFocus: elements.allIssuesButton,
      });

      void dependencies.completionSource.loadCompletedPuzzleIds(
        archive.entries.map((entry) => entry.id),
      ).then((completedPuzzleIds) => {
        modal.update(viewId, {
          content: renderArchiveContent(
            archive,
            completedPuzzleIds,
            dependencies.buildPuzzleUrl,
          ),
        });
      }).catch((error) => {
        console.error(error);
        modal.update(viewId, {
          content: renderArchiveContent(
            archive,
            new Set(),
            dependencies.buildPuzzleUrl,
          ),
        });
      });
    });
  });
}
