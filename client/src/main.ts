import { initApp, type AppDependencies } from './app.ts';
import { createLocalCompletionSource } from './completion.ts';
import { ensureCurrentDeployment } from './deploymentVersion.ts';
import { getGameElements } from './dom.ts';
import { loadHowToPlayManifest } from './howToPlayLoader.ts';
import {
  buildPuzzleUrl as buildPuzzleUrlFromLocation,
  getRequestedPuzzleId,
} from './navigation.ts';
import { loadPuzzle } from './puzzleLoader.ts';
import { createLocalGameStateStore } from './storage.ts';
import { renderLoadError } from './views/puzzleView.ts';

async function start(): Promise<void> {
  const shouldStart = await ensureCurrentDeployment();

  if (!shouldStart) {
    return;
  }

  const elements = getGameElements();
  const gameStateStore = createLocalGameStateStore({
    shouldPersist: !import.meta.env.DEV,
  });
  const dependencies: AppDependencies = {
    loadPuzzle,
    loadHowToPlay: loadHowToPlayManifest,
    gameStateStore,
    completionSource: createLocalCompletionSource(gameStateStore),
    buildPuzzleUrl: (puzzleId, latestPuzzleId) =>
      buildPuzzleUrlFromLocation(
        window.location.href,
        puzzleId,
        latestPuzzleId,
      ),
  };
  const requestedPuzzleId = getRequestedPuzzleId(window.location.search);

  try {
    await initApp(elements, requestedPuzzleId, dependencies);
  } catch (error) {
    renderLoadError(elements);
    console.error(error);
  }
}

void start();
