import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PuzzleArchive } from '../types.ts';
import { renderArchiveContent } from './archiveView.ts';

type ClickOptions = Partial<Pick<MouseEvent,
  'altKey' | 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>>;

type FakeClickEvent = {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  preventDefault: () => void;
};

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  private readonly listeners = new Map<string, Array<(event: MouseEvent) => void>>();
  className = '';
  disabled = false;
  href = '';
  scrollTop = 0;
  target = '';
  textContent = '';
  type = '';

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(
    type: string,
    listener: (event: MouseEvent) => void,
  ): void {
    const listeners = this.listeners.get(type) ?? [];

    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click(options: ClickOptions = {}): FakeClickEvent {
    const event = {
      altKey: false,
      button: 0,
      ctrlKey: false,
      defaultPrevented: false,
      metaKey: false,
      shiftKey: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...options,
    } as FakeClickEvent;

    this.listeners.get('click')?.forEach((listener) => {
      listener(event as unknown as MouseEvent);
    });
    return event;
  }

  findByClass(className: string): FakeElement[] {
    const matches: FakeElement[] = this.className.split(' ').includes(className)
      ? [this]
      : [];

    this.children.forEach((child) => {
      matches.push(...child.findByClass(className));
    });
    return matches;
  }
}

const archive: PuzzleArchive = {
  entries: [
    { id: '2026-07-31', issueNumber: 2, songClue: 'Newest clue' },
    { id: '2026-07-30', issueNumber: 1, songClue: 'Older clue' },
  ],
  latestPuzzleId: '2026-07-31',
  selectedPuzzleId: '2026-07-31',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('archive puzzle selection', () => {
  it('intercepts an ordinary activation and selects only once', () => {
    stubDocument();
    const selectPuzzle = vi.fn();
    const content = renderArchiveContent(
      archive,
      new Set(),
      buildPuzzleUrl,
      selectPuzzle,
    ) as unknown as FakeElement;
    const link = content.findByClass('archive-link')[1];

    const firstClick = link.click();
    const repeatClick = link.click();

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
    stubDocument();
    const selectPuzzle = vi.fn();
    const content = renderArchiveContent(
      archive,
      new Set(),
      buildPuzzleUrl,
      selectPuzzle,
    ) as unknown as FakeElement;
    const link = content.findByClass('archive-link')[0];

    const click = link.click(options);

    expect(click.defaultPrevented).toBe(false);
    expect(selectPuzzle).not.toHaveBeenCalled();
  });

  it('preserves a link targeting another browsing context', () => {
    stubDocument();
    const selectPuzzle = vi.fn();
    const content = renderArchiveContent(
      archive,
      new Set(),
      buildPuzzleUrl,
      selectPuzzle,
    ) as unknown as FakeElement;
    const link = content.findByClass('archive-link')[0];

    link.target = '_blank';
    const click = link.click();

    expect(click.defaultPrevented).toBe(false);
    expect(selectPuzzle).not.toHaveBeenCalled();
  });
});

function buildPuzzleUrl(puzzleId: string, latestPuzzleId: string): string {
  return puzzleId === latestPuzzleId
    ? 'https://example.test/'
    : `https://example.test/?puzzle=${puzzleId}`;
}

function stubDocument(): void {
  vi.stubGlobal('document', {
    createDocumentFragment: () => new FakeElement(),
    createElement: () => new FakeElement(),
  });
}
