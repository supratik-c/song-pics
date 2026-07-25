import type { PuzzleClue } from './types.ts';

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

export function createPuzzleShareRequest(
  puzzle: PuzzleClue,
  url: string,
): PuzzleShareRequest {
  return {
    title: 'Scribble Bops',
    text: "Can you guess today's song from some questionable hand-drawn doodles?",
    url,
  };
}

export function getCopyText(request: PuzzleShareRequest): string {
  return `${request.title}\n${request.text}\n${request.url}`;
}
