import type { CompletionSource } from './completion.ts';
import type { GameElements } from './dom.ts';
import {
  revealSong,
  submitGuess,
} from './game.ts';
import { GAME_RULES } from './gameConfig.ts';
import type { HowToPlayManifest } from './howToPlayLoader.ts';
import {
  createModalController,
  renderModalMessage,
  type ModalController,
} from './modal.ts';
import type { GameStateStore } from './storage.ts';
import {
  FuturePuzzleError,
  type GameState,
  type LoadedPuzzle,
  type Puzzle,
  type PuzzleArchive,
} from './types.ts';
import {
  renderArchiveContent,
  type BuildPuzzleUrl,
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
import { renderResultContent } from './views/resultView.ts';

export type AppDependencies = {
  loadPuzzle: (requestedPuzzleId: string | null) => Promise<LoadedPuzzle>;
  loadHowToPlay: () => Promise<HowToPlayManifest>;
  gameStateStore: GameStateStore;
  completionSource: CompletionSource;
  buildPuzzleUrl: BuildPuzzleUrl;
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
    void handleHowToPlay(elements, modal, dependencies);
  });

  try {
    ({ puzzle, archive } = await dependencies.loadPuzzle(requestedPuzzleId));
  } catch (error) {
    if (error instanceof FuturePuzzleError) {
      renderFuturePuzzle(elements, error.archive);
      bindArchiveButton(elements, error.archive, modal, dependencies);
      return;
    }

    throw error;
  }

  let state = dependencies.gameStateStore.load(puzzle.id);

  renderPuzzle(elements, puzzle, archive);
  renderState(elements, state, GAME_RULES);
  bindArchiveButton(elements, archive, modal, dependencies);

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearGuessValidation(elements);

    const rawGuess = String(
      new FormData(elements.form).get('guess') ?? '',
    );
    const submission = submitGuess(state, rawGuess, puzzle, GAME_RULES);

    if (submission.artistRemoved) {
      renderArtistHint(elements, puzzle.artist);
    }

    if (submission.kind === 'invalid') {
      renderGuessValidation(elements, submission.reason, GAME_RULES);
      return;
    }

    state = submission.state;
    dependencies.gameStateStore.save(puzzle.id, state);
    elements.form.reset();
    renderState(elements, state, GAME_RULES);

    if (state.status === 'playing') {
      elements.guessInput.focus();
    } else {
      openResultModal(elements, puzzle, state, modal);
    }
  });

  elements.revealArtistButton.addEventListener('click', () => {
    if (state.status === 'playing') {
      renderArtistHint(elements, puzzle.artist);
    }
  });

  elements.revealSongButton.addEventListener('click', () => {
    if (state.status === 'playing') {
      state = revealSong(state);
      dependencies.gameStateStore.save(puzzle.id, state);
      clearGuessValidation(elements);
      renderState(elements, state, GAME_RULES);
    }

    openResultModal(elements, puzzle, state, modal);
  });
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
  elements.previousIssuesButton.addEventListener('click', () => {
    const viewId = modal.open({
      title: 'Previous Issues',
      content: renderModalMessage('Checking your back catalogue...'),
      returnFocus: elements.previousIssuesButton,
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
}

function openResultModal(
  elements: GameElements,
  puzzle: Puzzle,
  state: GameState,
  modal: ModalController,
): void {
  if (state.status === 'playing') {
    return;
  }

  const result = renderResultContent(puzzle, state.status);

  modal.open({
    title: result.title,
    content: result.content,
    returnFocus: elements.revealSongButton,
    onClose: result.onClose,
    tone: result.tone,
  });
}
