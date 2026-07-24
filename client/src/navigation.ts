import type { PuzzleArchive } from './types.ts';
import { isPuzzleDateId } from './puzzleDates.ts';

export type BuildPuzzleUrl = (
  puzzleId: string,
  latestPuzzleId: string,
) => string;

export type AdjacentPuzzleIds = {
  previousPuzzleId: string | null;
  nextPuzzleId: string | null;
};

export function getRequestedPuzzleId(search: string): string | null {
  return new URLSearchParams(search).get('puzzle');
}

export function getSharePuzzleId(
  pathname: string,
  basePath: string,
): string | null {
  const normalizedBasePath = normalizeBasePath(basePath);

  if (!pathname.startsWith(normalizedBasePath)) {
    return null;
  }

  const relativePath = pathname.slice(normalizedBasePath.length);
  const match = /^share\/([^/]+)\/?$/.exec(relativePath);

  if (!match) {
    return null;
  }

  let puzzleId: string;

  try {
    puzzleId = decodeURIComponent(match[1]);
  } catch {
    return null;
  }

  return isPuzzleDateId(puzzleId) ? puzzleId : null;
}

export function buildPuzzleShareUrl(
  currentHref: string,
  puzzleId: string,
  basePath: string,
): string {
  const currentUrl = new URL(currentHref);
  const shareUrl = new URL(
    `${normalizeBasePath(basePath)}share/${encodeURIComponent(puzzleId)}/`,
    currentUrl.origin,
  );

  return shareUrl.toString();
}

export function buildCanonicalPuzzleUrl(
  currentHref: string,
  puzzleId: string,
  basePath: string,
): string {
  const currentUrl = new URL(currentHref);
  const canonicalUrl = new URL(
    normalizeBasePath(basePath),
    currentUrl.origin,
  );

  canonicalUrl.searchParams.set('puzzle', puzzleId);
  return canonicalUrl.toString();
}

export function getAdjacentPuzzleIds(
  archive: PuzzleArchive,
): AdjacentPuzzleIds {
  const selectedIndex = archive.entries.findIndex(
    (entry) => entry.id === archive.selectedPuzzleId,
  );

  if (selectedIndex === -1) {
    return {
      previousPuzzleId: null,
      nextPuzzleId: null,
    };
  }

  return {
    previousPuzzleId: archive.entries[selectedIndex + 1]?.id ?? null,
    nextPuzzleId: archive.entries[selectedIndex - 1]?.id ?? null,
  };
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

function normalizeBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/')
    ? basePath
    : `/${basePath}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}
