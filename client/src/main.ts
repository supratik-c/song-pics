import { initApp, type AppDependencies } from './app.ts';
import { createBrowserShareGateway } from './browserShare.ts';
import { createLocalCompletionSource } from './completion.ts';
import { ensureCurrentDeployment } from './deploymentVersion.ts';
import { getGameElements } from './dom.ts';
import { loadHowToPlayManifest } from './howToPlayLoader.ts';
import {
  buildCanonicalPuzzleUrl,
  buildPuzzleShareUrl,
  buildPuzzleUrl as buildPuzzleUrlFromLocation,
  getRequestedPuzzleId,
  getSharePuzzleId,
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
  const sharePuzzleId = getSharePuzzleId(
    window.location.pathname,
    import.meta.env.BASE_URL,
  );

  if (sharePuzzleId) {
    window.history.replaceState(
      window.history.state,
      '',
      buildCanonicalPuzzleUrl(
        window.location.href,
        sharePuzzleId,
        import.meta.env.BASE_URL,
      ),
    );
  }

  const gameStateStore = createLocalGameStateStore({
    shouldPersist: !import.meta.env.DEV,
  });
  const dependencies: AppDependencies = {
    loadPuzzle,
    loadHowToPlay: loadHowToPlayManifest,
    gameStateStore,
    completionSource: createLocalCompletionSource(gameStateStore),
    shareGateway: createBrowserShareGateway(),
    buildPuzzleUrl: (puzzleId, latestPuzzleId) =>
      buildPuzzleUrlFromLocation(
        window.location.href,
        puzzleId,
        latestPuzzleId,
      ),
    buildPuzzleShareUrl: (puzzleId) => buildPuzzleShareUrl(
      window.location.href,
      puzzleId,
      import.meta.env.BASE_URL,
    ),
  };
  const requestedPuzzleId = sharePuzzleId ??
    getRequestedPuzzleId(window.location.search);

  try {
    await initApp(elements, requestedPuzzleId, dependencies);
  } catch (error) {
    renderLoadError(elements);
    console.error(error);
  }
}

void start();
