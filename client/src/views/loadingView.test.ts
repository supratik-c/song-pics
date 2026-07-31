import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderLoadingIndicator } from './loadingView.ts';

class FakeStyle {
  private readonly properties = new Map<string, string>();

  getPropertyValue(name: string): string {
    return this.properties.get(name) ?? '';
  }

  setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly style = new FakeStyle();
  className = '';
  textContent = '';

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loading indicator', () => {
  it('renders an accessible default status with decorative notes', () => {
    stubDocument();

    const content = renderLoadingIndicator() as unknown as FakeElement;
    const indicator = content.children[0];
    const [leadingNote, label, trailingNote] = indicator.children;

    expect(indicator.className).toBe(
      'loading-indicator loading-indicator-medium',
    );
    expect(indicator.attributes.get('role')).toBe('status');
    expect(indicator.attributes.get('aria-live')).toBe('polite');
    expect(indicator.attributes.get('aria-atomic')).toBe('true');
    expect(
      indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
    ).toBe('250ms');
    expect(label.textContent).toBe('Scribbling...');
    expect(leadingNote.textContent).toBe('♪');
    expect(trailingNote.textContent).toBe('♪');
    expect(leadingNote.attributes.get('aria-hidden')).toBe('true');
    expect(trailingNote.attributes.get('aria-hidden')).toBe('true');
  });

  it.each(['small', 'medium', 'large'] as const)(
    'supports the %s size',
    (size) => {
      stubDocument();

      const content = renderLoadingIndicator({
        label: 'Fetching clues...',
        size,
        noteStaggerMs: 320,
        revealDelayMs: 400,
      }) as unknown as FakeElement;
      const indicator = content.children[0];

      expect(indicator.className).toContain(`loading-indicator-${size}`);
      expect(indicator.children[1].textContent).toBe('Fetching clues...');
      expect(
        indicator.style.getPropertyValue('--loading-note-stagger'),
      ).toBe('320ms');
      expect(
        indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
      ).toBe('400ms');
    },
  );

  it('supports revealing immediately', () => {
    stubDocument();

    const content = renderLoadingIndicator({
      revealDelayMs: 0,
    }) as unknown as FakeElement;
    const indicator = content.children[0];

    expect(
      indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
    ).toBe('0ms');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'uses the default reveal delay for an invalid value of %s',
    (revealDelayMs) => {
      stubDocument();

      const content = renderLoadingIndicator({
        revealDelayMs,
      }) as unknown as FakeElement;
      const indicator = content.children[0];

      expect(
        indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
      ).toBe('250ms');
    },
  );
});

function stubDocument(): void {
  vi.stubGlobal('document', {
    createDocumentFragment: () => new FakeElement(),
    createElement: () => new FakeElement(),
  });
}
