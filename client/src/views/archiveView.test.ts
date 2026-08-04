import { describe, expect, it, vi } from 'vitest';
import type { PuzzleArchive } from '../domain/types.ts';
import { renderArchiveContent } from './archiveView.ts';

type ClickOptions = Partial<Pick<MouseEventInit,
  'altKey' | 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>>;

const archive: PuzzleArchive = {
  entries: [
    { id: '2026-07-31', issueNumber: 2, songClue: 'Newest clue' },
    { id: '2026-07-30', issueNumber: 1, songClue: 'Older clue' },
  ],
  latestPuzzleId: '2026-07-31',
  selectedPuzzleId: '2026-07-31',
};

describe('archive puzzle selection', () => {
  it('intercepts an ordinary activation and selects only once', () => {
    const selectPuzzle = vi.fn();
    const content = renderArchiveContent(
      archive,
      new Set(),
      buildPuzzleUrl,
      selectPuzzle,
    );
    const link = content.querySelectorAll<HTMLAnchorElement>(
      '.archive-link',
    )[1];

    const firstClick = click(link);
    const repeatClick = click(link);

    expect(firstClick.defaultPrevented).toBe(true);
    expect(repeatClick.defaultPrevented).toBe(true);
    expect(selectPuzzle).toHaveBeenCalledOnce();
    expect(selectPuzzle).toHaveBeenCalledWith(
      'https://example.test/?puzzle=2026-07-30',
    );
  });

  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])('preserves native navigation for %o', (options) => {
    const selectPuzzle = vi.fn();
    const content = renderArchiveContent(
      archive,
      new Set(),
      buildPuzzleUrl,
      selectPuzzle,
    );
    const link = content.querySelectorAll<HTMLAnchorElement>(
      '.archive-link',
    )[0];

    const event = click(link, options);

    expect(event.defaultPrevented).toBe(false);
    expect(selectPuzzle).not.toHaveBeenCalled();
  });

  it('preserves a link targeting another browsing context', () => {
    const selectPuzzle = vi.fn();
    const content = renderArchiveContent(
      archive,
      new Set(),
      buildPuzzleUrl,
      selectPuzzle,
    );
    const link = content.querySelectorAll<HTMLAnchorElement>(
      '.archive-link',
    )[0];

    link.target = '_blank';
    const event = click(link);

    expect(event.defaultPrevented).toBe(false);
    expect(selectPuzzle).not.toHaveBeenCalled();
  });
});

function click(
  link: HTMLAnchorElement,
  options: ClickOptions = {},
): MouseEvent {
  const event = new MouseEvent('click', {
    altKey: false,
    button: 0,
    cancelable: true,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...options,
  });

  link.dispatchEvent(event);
  return event;
}

function buildPuzzleUrl(puzzleId: string, latestPuzzleId: string): string {
  return puzzleId === latestPuzzleId
    ? 'https://example.test/'
    : `https://example.test/?puzzle=${puzzleId}`;
}
