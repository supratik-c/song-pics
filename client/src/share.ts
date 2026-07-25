import type { PuzzlePerformance } from './performance.ts';

export type PuzzleShareRequest = {
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
    title: 'Scribble Bops',
    text:
      "Can you guess today's song from some questionable hand-drawn doodles?\n" +
      getPerformanceLine(performance),
    url,
  };
}

export function getCopyText(request: PuzzleShareRequest): string {
  return `${request.title}\n${request.text}\n${request.url}`;
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
