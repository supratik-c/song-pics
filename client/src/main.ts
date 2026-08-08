import { initApp, type AppDependencies } from './app.ts';
import {
  buildCanonicalPuzzleUrl,
  buildPuzzleShareUrl,
  buildPuzzleUrl as buildPuzzleUrlFromLocation,
  getRequestedPuzzleId,
  getSharePuzzleId,
} from './domain/navigation.ts';
import {
  alwaysShowSupport,
  whenSolvedAtLeast,
  type SupportTrigger,
} from './domain/supportTriggers.ts';
import { loadPuzzle } from './content/puzzleLoader.ts';
import { loadHowToPlayManifest } from './content/howToPlayLoader.ts';
import { createBrowserShareGateway } from './platform/browserShare.ts';
import { createLocalCompletionSource } from './platform/completion.ts';
import { ensureCurrentDeployment } from './platform/deploymentVersion.ts';
import { getGameElements } from './platform/dom.ts';
import {
  createLocalArtistRevealNoticeStore,
  createLocalGameStateStore,
  createSessionYouTubeConsentStore,
} from './platform/storage.ts';
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

  // Dev keeps progress for the tab session so archive badges and the support
  // prompt are reachable, namespaced per dev-server run so a restart starts
  // clean and dev can never collide with production keys on localhost. The
  // artist-reveal notice shares this split — without it, the one-time
  // popover would fire exactly once ever on localhost too.
  const browserStorageOptions = import.meta.env.DEV
    ? {
        getStorage: () => sessionStorage,
        namespace: `scribble-bops:dev:${import.meta.env.VITE_DEV_RUN_ID}`,
      }
    : {};
  const gameStateStore = createLocalGameStateStore(browserStorageOptions);
  const artistRevealNoticeStore = createLocalArtistRevealNoticeStore(
    browserStorageOptions,
  );

  // Swap this composition to change what triggers the Ko-fi prompt. It is
  // gated on a terminal status because the prompt is mounted beside the
  // post-solve result, not the active guessing UI; whenSolvedAtLeast is the
  // reusable, hotswappable building block (see domain/supportTriggers.ts).
  // Dev always shows the prompt so it can be inspected without three solves.
  const supportTrigger: SupportTrigger = import.meta.env.DEV
    ? alwaysShowSupport
    : (context) =>
        context.status !== 'playing' && whenSolvedAtLeast(3)(context);

  // TODO: replace with the real Ko-fi page before this ships publicly.
  const SUPPORT_URL = 'https://ko-fi.com/REPLACE_ME';

  const dependencies: AppDependencies = {
    loadPuzzle,
    loadHowToPlay: loadHowToPlayManifest,
    gameStateStore,
    artistRevealNoticeStore,
    youtubeConsentStore: createSessionYouTubeConsentStore(),
    completionSource: createLocalCompletionSource(gameStateStore),
    shareGateway: createBrowserShareGateway(),
    navigateToPuzzle: (url) => window.location.assign(url),
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
    supportTrigger,
    supportUrl: SUPPORT_URL,
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
