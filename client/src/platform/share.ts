import { PRODUCT_NAME, SHARE_INVITATION } from '../../shared/branding.mjs';
import type { PuzzlePerformance } from '../domain/performance.ts';

export type PuzzleShareRequest = {
  // Not read by getCopyText — the clipboard text opens with the invitation,
  // not the product name, to avoid repeating the card's own og:title.
  // browserShare.ts still forwards this to ShareData.title for OS share
  // sheets (e.g. Android's EXTRA_SUBJECT, the iOS/macOS mail subject).
  title: string;
  text: string;
  url: string;
};

export type PreferredShareAction = 'native-share' | 'copy';

export type ShareOutcome =
  | 'shared'
  | 'copied'
  | 'cancelled'
  | 'failed';

export type ShareGateway = {
  preferredAction: PreferredShareAction;
  share: (request: PuzzleShareRequest) => Promise<ShareOutcome>;
};

export type PuzzleShareRequestFactory = () => PuzzleShareRequest;

export function createPuzzleShareRequest(
  url: string,
  performance: PuzzlePerformance,
): PuzzleShareRequest {
  return {
    title: PRODUCT_NAME,
    text: `${SHARE_INVITATION}\n${getPerformanceLine(performance)}`,
    url,
  };
}

export function getCopyText(request: PuzzleShareRequest): string {
  return `${request.text}\n${request.url}`;
}

export async function shareCurrentPuzzle(
  getRequest: PuzzleShareRequestFactory,
  share: (request: PuzzleShareRequest) => Promise<ShareOutcome>,
): Promise<{ request: PuzzleShareRequest; outcome: ShareOutcome }> {
  const request = getRequest();
  const outcome = await share(request);

  return { request, outcome };
}

function getPerformanceLine(performance: PuzzlePerformance): string {
  if (performance.outcome !== 'solved') {
    return 'Or will you succumb to the scribbles?';
  }

  const guessLabel = performance.attemptsUsed === 1 ? 'guess' : 'guesses';

  return `I got it in ${performance.attemptsUsed} ${guessLabel}!`;
}
