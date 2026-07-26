import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  renderDoodleCredit,
  renderPanelLyrics,
} from './puzzleView.ts';
import type { GameStatus } from '../types.ts';

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
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
    'renders ordered lyric sentences for %s games',
    (status) => {
      const panels = setupPanels(2);

      renderPanelLyrics(
        panels as unknown as HTMLElement,
        status,
        ['First line', 'Second line'],
      );

      const captions = panels.querySelectorAll('.panel-lyric');

      expect(captions).toHaveLength(2);
      expect(captions[0].textContent).toBe('♪  First line  ♪');
      expect(captions[1].textContent).toBe('♪  Second line  ♪');
      expect(captions[0].children).toHaveLength(0);
    },
  );

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

    expect(captions).toHaveLength(1);
    expect(captions[0].textContent).toBe('♪  Updated line  ♪');
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
  });

  const container = new FakeElement();

  for (let index = 0; index < count; index += 1) {
    const panel = new FakeElement();
    panel.className = 'panel';
    container.append(panel);
  }

  return container;
}
