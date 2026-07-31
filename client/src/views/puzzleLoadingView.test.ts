import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameElements } from '../dom.ts';
import type { PuzzleClue } from '../types.ts';
import {
  renderFuturePuzzle,
  renderLoadError,
  renderPuzzle,
} from './puzzleView.ts';

class FakeClassList {
  private readonly values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }

  remove(value: string): void {
    this.values.delete(value);
  }

  toggle(value: string, force: boolean): void {
    if (force) {
      this.add(value);
    } else {
      this.remove(value);
    }
  }
}

class FakeStyle {
  private readonly properties = new Map<string, string>();

  setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }
}

class FakeElement extends EventTarget {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly classList = new FakeClassList();
  readonly dataset: Record<string, string> = {};
  readonly style = new FakeStyle();
  className = '';
  closestElement: FakeElement | null = null;
  disabled = false;
  hidden = false;
  inert = false;
  parent: FakeElement | null = null;
  textContent = '';
  type = '';

  append(...nodes: FakeElement[]): void {
    nodes.forEach((node) => {
      node.parent = this;
      this.children.push(node);
    });
  }

  closest(): FakeElement | null {
    return this.closestElement;
  }

  focus(): void {}

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  querySelector(): FakeElement | null {
    return null;
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children.forEach((child) => {
      child.parent = null;
    });
    this.children.splice(0, this.children.length);
    this.append(...nodes);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  findByClass(className: string): FakeElement[] {
    const matches: FakeElement[] =
      this.className.split(' ').includes(className) ? [this] : [];

    this.children.forEach((child) => {
      matches.push(...child.findByClass(className));
    });
    return matches;
  }
}

class FakeImage extends FakeElement {
  alt = '';
  complete: boolean;
  decode: ReturnType<typeof vi.fn>;
  naturalWidth: number;
  src = '';

  constructor({
    complete = false,
    naturalWidth = 0,
    decode = vi.fn().mockResolvedValue(undefined),
  }: {
    complete?: boolean;
    naturalWidth?: number;
    decode?: ReturnType<typeof vi.fn>;
  } = {}) {
    super();
    this.complete = complete;
    this.naturalWidth = naturalWidth;
    this.decode = decode;
  }

  finishLoading(): void {
    this.complete = true;
    this.naturalWidth = 800;
    this.dispatchEvent(new Event('load'));
  }

  failLoading(): void {
    this.complete = true;
    this.dispatchEvent(new Event('error'));
  }
}

const puzzle: PuzzleClue = {
  id: '2026-07-31',
  displayDate: '31 Jul 26',
  issueNumber: 2,
  songClue: 'A clue without spoilers',
  panels: [
    { src: '/content/puzzles/2026-07-31/1.webp' },
    { src: '/content/puzzles/2026-07-31/2.webp' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('puzzle panel loading', () => {
  it('keeps all panels hidden behind the loader until every image decodes', async () => {
    const images = [new FakeImage(), new FakeImage()];
    const elements = createElements();

    stubDocument(images);
    const rendering = renderPuzzle(elements, puzzle);

    expect(elements.form.hidden).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.guessInput.disabled).toBe(true);
    expect(elements.revealArtistButton.disabled).toBe(true);
    expect(elements.revealSongButton.disabled).toBe(true);
    expect(elements.submitButton.disabled).toBe(true);
    expect(fake(elements.panels).attributes.get('aria-busy')).toBe('true');
    expect(
      fake(elements.panels).classList.contains('is-loading'),
    ).toBe(true);
    expect(fake(elements.panels).findByClass('loading-indicator')).toHaveLength(1);

    images[0].finishLoading();
    await Promise.resolve();
    await Promise.resolve();

    expect(fake(elements.panels).findByClass('loading-indicator')).toHaveLength(1);
    expect(elements.form.hidden).toBe(false);

    images[1].finishLoading();
    await rendering;

    expect(images[0].decode).toHaveBeenCalledOnce();
    expect(images[1].decode).toHaveBeenCalledOnce();
    expect(fake(elements.panels).findByClass('panel')).toHaveLength(2);
    expect(fake(elements.panels).findByClass('loading-indicator')).toHaveLength(0);
    expect(elements.panels.hasAttribute('aria-busy')).toBe(false);
    expect(
      fake(elements.panels).classList.contains('is-loading'),
    ).toBe(false);
    expect(elements.form.hidden).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.submitButton.disabled).toBe(true);
  });

  it('reveals cached images after decoding them', async () => {
    const images = [
      new FakeImage({ complete: true, naturalWidth: 800 }),
      new FakeImage({ complete: true, naturalWidth: 800 }),
    ];
    const elements = createElements();

    stubDocument(images);
    await renderPuzzle(elements, puzzle);

    expect(images.every((image) => image.decode.mock.calls.length === 1)).toBe(true);
    expect(elements.panels.hasAttribute('aria-busy')).toBe(false);
    expect(elements.form.hidden).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.submitButton.disabled).toBe(true);
  });

  it('rejects an image request failure and clears loading in the error view', async () => {
    const images = [new FakeImage(), new FakeImage()];
    const elements = createElements();

    fake(elements.form).classList.add('is-layout-placeholder');
    stubDocument(images);
    const rendering = renderPuzzle(elements, puzzle);
    images[0].failLoading();

    await expect(rendering).rejects.toThrow(
      'A clue panel image could not be loaded.',
    );

    renderLoadError(elements);

    expect(fake(elements.panels).findByClass('loading-indicator')).toHaveLength(0);
    expect(elements.panels.hasAttribute('aria-busy')).toBe(false);
    expect(elements.form.hidden).toBe(true);
    expect(
      fake(elements.form).classList.contains('is-layout-placeholder'),
    ).toBe(false);
    expect(elements.form.inert).toBe(true);
    expect(elements.message.hidden).toBe(false);
  });

  it('rejects when a loaded image cannot be decoded', async () => {
    const decode = vi.fn().mockRejectedValue(new Error('bad image'));
    const images = [new FakeImage({ decode }), new FakeImage()];
    const elements = createElements();

    stubDocument(images);
    const rendering = renderPuzzle(elements, puzzle);
    images[0].finishLoading();

    await expect(rendering).rejects.toThrow(
      'A clue panel image could not be decoded.',
    );
  });

  it('removes the interaction reservation for a future puzzle', () => {
    const elements = createElements();

    fake(elements.form).classList.add('is-layout-placeholder');
    stubDocument([new FakeImage()]);
    renderFuturePuzzle(elements);

    expect(elements.form.hidden).toBe(true);
    expect(
      fake(elements.form).classList.contains('is-layout-placeholder'),
    ).toBe(false);
    expect(elements.form.inert).toBe(true);
  });
});

function createElements(): GameElements {
  const game = new FakeElement();
  const form = new FakeElement();
  const panels = new FakeElement();
  const resultRegion = new FakeElement();
  const elements = {
    artistHint: new FakeElement(),
    attemptsCount: new FakeElement(),
    date: new FakeElement(),
    doodleCredit: new FakeElement(),
    form,
    guessInput: new FakeElement(),
    guessList: new FakeElement(),
    howToPlayButton: new FakeElement(),
    message: new FakeElement(),
    panels,
    allIssuesButton: new FakeElement(),
    revealArtistButton: new FakeElement(),
    revealSongButton: new FakeElement(),
    resultRegion,
    shareRegion: new FakeElement(),
    submitButton: new FakeElement(),
    songClue: new FakeElement(),
    validationMessage: new FakeElement(),
  };

  form.closestElement = game;
  form.inert = true;
  panels.classList.add('is-loading');
  panels.setAttribute('aria-busy', 'true');
  return elements as unknown as GameElements;
}

function stubDocument(images: FakeImage[]): void {
  const imageQueue = [...images];

  vi.stubGlobal('document', {
    body: new FakeElement(),
    createDocumentFragment: () => new FakeElement(),
    createElement: (tagName: string) =>
      tagName === 'img' ? imageQueue.shift() : new FakeElement(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

function fake(element: HTMLElement): FakeElement {
  return element as unknown as FakeElement;
}
