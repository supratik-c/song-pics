import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  renderDoodleCredit,
  renderPanelLyrics,
} from './puzzleView.ts';
import type { GameStatus } from '../types.ts';

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly style = new FakeStyle();
  className = '';
  hidden = false;
  parent: FakeElement | null = null;
  textContent = '';

  append(...nodes: FakeElement[]): void {
    nodes.forEach((node) => {
      node.parent = this;
      this.children.push(node);
    });
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector).item(0);
  }

  querySelectorAll(selector: string): FakeNodeList {
    const className = selector.startsWith('.') ? selector.slice(1) : '';
    const matches = new FakeNodeList();

    this.children.forEach((child) => {
      if (child.className.split(' ').includes(className)) {
        matches.push(child);
      }
      matches.push(...child.querySelectorAll(selector));
    });

    return matches;
  }

  remove(): void {
    if (!this.parent) {
      return;
    }

    const index = this.parent.children.indexOf(this);

    if (index !== -1) {
      this.parent.children.splice(index, 1);
    }
    this.parent = null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

class FakeStyle {
  private readonly properties = new Map<string, string>();

  getPropertyValue(name: string): string {
    return this.properties.get(name) ?? '';
  }

  setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }
}

class FakeNodeList extends Array<FakeElement> {
  item(index: number): FakeElement | null {
    return this[index] ?? null;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('panel lyric rendering', () => {
  it('keeps lyric text out of the DOM while play is active', () => {
    const panels = setupPanels(2);

    renderPanelLyrics(
      panels as unknown as HTMLElement,
      'playing',
      ['First line', 'Second line'],
    );

    expect(panels.querySelectorAll('.panel-lyric')).toHaveLength(0);
  });

  it.each<GameStatus>(['solved', 'revealed', 'failed'])(
    'renders independent ordered word waves for %s games',
    (status) => {
      const panels = setupPanels(2);

      renderPanelLyrics(
        panels as unknown as HTMLElement,
        status,
        ['First line', 'Second line'],
      );

      const captions = panels.querySelectorAll('.panel-lyric');
      const firstTokens = captions[0].querySelectorAll('.panel-lyric-token');
      const secondTokens = captions[1].querySelectorAll('.panel-lyric-token');
      const firstEnding = captions[0].querySelector('.panel-lyric-ending');

      expect(captions).toHaveLength(2);
      expect(panels.children[0].attributes.get('data-panel-number')).toBe('1');
      expect(panels.children[1].attributes.get('data-panel-number')).toBe('2');
      expect(firstTokens.map((token) => token.textContent)).toEqual([
        '♪',
        'First',
        'line',
        '♪',
      ]);
      expect(secondTokens.map((token) => token.textContent)).toEqual([
        '♪',
        'Second',
        'line',
        '♪',
      ]);
      expect(tokenIndexes(firstTokens)).toEqual(['0', '1', '2', '3']);
      expect(tokenIndexes(secondTokens)).toEqual(['0', '1', '2', '3']);
      expect(
        firstEnding?.querySelectorAll('.panel-lyric-token')
          .map((token) => token.textContent),
      ).toEqual(['line', '♪']);
    },
  );

  it('keeps a single lyric word and trailing note in one ending group', () => {
    const panels = setupPanels(1);

    renderPanelLyrics(
      panels as unknown as HTMLElement,
      'solved',
      ['Supercalifragilisticexpialidocious'],
    );

    const caption = panels.querySelector('.panel-lyric');
    const ending = caption?.querySelector('.panel-lyric-ending');
    const endingTokens = ending?.querySelectorAll('.panel-lyric-token');

    expect(endingTokens?.map((token) => token.textContent)).toEqual([
      'Supercalifragilisticexpialidocious',
      '♪',
    ]);
    expect(endingTokens && tokenIndexes(endingTokens)).toEqual(['1', '2']);
    expect(caption && renderedText(caption)).toBe(
      '♪  Supercalifragilisticexpialidocious  ♪',
    );
  });

  it('collapses authored whitespace and keeps punctuation with words', () => {
    const panels = setupPanels(1);

    renderPanelLyrics(
      panels as unknown as HTMLElement,
      'solved',
      ["  Don't   stop,   now!  "],
    );

    const caption = panels.querySelector('.panel-lyric');
    const tokens = caption?.querySelectorAll('.panel-lyric-token');

    expect(tokens?.map((token) => token.textContent)).toEqual([
      '♪',
      "Don't",
      'stop,',
      'now!',
      '♪',
    ]);
    expect(caption && renderedText(caption)).toBe(
      "♪  Don't stop, now!  ♪",
    );
  });

  it.each([undefined, []])(
    'renders no captions when lyric lines are %s',
    (lyricLines) => {
      const panels = setupPanels(2);

      renderPanelLyrics(
        panels as unknown as HTMLElement,
        'solved',
        lyricLines,
      );

      expect(panels.querySelectorAll('.panel-lyric')).toHaveLength(0);
    },
  );

  it('replaces existing captions instead of duplicating them', () => {
    const panels = setupPanels(1);

    renderPanelLyrics(
      panels as unknown as HTMLElement,
      'solved',
      ['First line'],
    );
    renderPanelLyrics(
      panels as unknown as HTMLElement,
      'failed',
      ['Updated line'],
    );

    const captions = panels.querySelectorAll('.panel-lyric');
    const tokens = captions[0].querySelectorAll('.panel-lyric-token');

    expect(captions).toHaveLength(1);
    expect(tokens.map((token) => token.textContent)).toEqual([
      '♪',
      'Updated',
      'line',
      '♪',
    ]);
  });
});

describe('doodler credit rendering', () => {
  it('renders the configured credit with the agreed wording', () => {
    const credit = new FakeElement();

    renderDoodleCredit(
      credit as unknown as HTMLElement,
      'purblevibes',
    );

    expect(credit.textContent).toBe('Doodled By: purblevibes');
    expect(credit.hidden).toBe(false);
  });

  it('clears and hides the credit when it is omitted', () => {
    const credit = new FakeElement();
    credit.textContent = 'Doodled By: previous artist';

    renderDoodleCredit(credit as unknown as HTMLElement, undefined);

    expect(credit.textContent).toBe('');
    expect(credit.hidden).toBe(true);
  });
});

function setupPanels(count: number): FakeElement {
  vi.stubGlobal('document', {
    createElement: () => new FakeElement(),
    createTextNode: (value: string) => {
      const text = new FakeElement();
      text.textContent = value;
      return text;
    },
  });

  const container = new FakeElement();

  for (let index = 0; index < count; index += 1) {
    const panel = new FakeElement();
    panel.className = 'panel';
    container.append(panel);
  }

  return container;
}

function tokenIndexes(tokens: FakeNodeList): string[] {
  return tokens.map((token) =>
    token.style.getPropertyValue('--lyric-wave-token-index')
  );
}

function renderedText(element: FakeElement): string {
  return element.children.length === 0
    ? element.textContent
    : element.children.map(renderedText).join('');
}
