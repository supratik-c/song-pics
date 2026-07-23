export function getRequestedPuzzleId(search: string): string | null {
  return new URLSearchParams(search).get('puzzle');
}

export function buildPuzzleUrl(
  currentHref: string,
  puzzleId: string,
  latestPuzzleId: string,
): string {
  const url = new URL(currentHref);

  if (puzzleId === latestPuzzleId) {
    url.searchParams.delete('puzzle');
  } else {
    url.searchParams.set('puzzle', puzzleId);
  }

  return url.toString();
}
