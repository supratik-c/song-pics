import { afterEach, describe, expect, it } from 'vitest';
import { loadAppShellIntoDocument } from '../testSupport.ts';
import { renderLoadingIndicator } from './loadingView.ts';

describe('loading indicator', () => {
  it('renders an accessible default status with decorative notes', () => {
    const content = renderLoadingIndicator();
    const indicator = content.children[0] as HTMLElement;
    const [leadingNote, label, trailingNote] = Array.from(
      indicator.children,
    ) as HTMLElement[];

    expect(indicator.className).toBe(
      'loading-indicator loading-indicator-medium',
    );
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.getAttribute('aria-live')).toBe('polite');
    expect(indicator.getAttribute('aria-atomic')).toBe('true');
    expect(
      indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
    ).toBe('250ms');
    expect(label.textContent).toBe('Scribbling...');
    expect(leadingNote.textContent).toBe('♪');
    expect(trailingNote.textContent).toBe('♪');
    expect(leadingNote.getAttribute('aria-hidden')).toBe('true');
    expect(trailingNote.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(['medium', 'large'] as const)(
    'supports the %s size',
    (size) => {
      const content = renderLoadingIndicator({
        label: 'Fetching clues...',
        size,
        noteStaggerMs: 320,
        revealDelayMs: 400,
      });
      const indicator = content.children[0] as HTMLElement;

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
    const content = renderLoadingIndicator({
      revealDelayMs: 0,
    });
    const indicator = content.children[0] as HTMLElement;

    expect(
      indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
    ).toBe('0ms');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'uses the default reveal delay for an invalid value of %s',
    (revealDelayMs) => {
      const content = renderLoadingIndicator({
        revealDelayMs,
      });
      const indicator = content.children[0] as HTMLElement;

      expect(
        indicator.style.getPropertyValue('--loading-indicator-reveal-delay'),
      ).toBe('250ms');
    },
  );
});

describe('static loading shell parity', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // index.html ships a hand-written copy of this markup so the panels area
  // has content on first paint, before main.ts runs. This proves the two
  // never drift instead of asserting one side's numbers by hand.
  it('matches the runtime indicator markup, timing, and copy', () => {
    loadAppShellIntoDocument();

    const staticIndicator = document.querySelector<HTMLElement>(
      '#panels .loading-indicator',
    );
    const rendered = renderLoadingIndicator({ size: 'large' });
    const renderedIndicator = rendered.children[0] as HTMLElement;

    if (!staticIndicator) {
      throw new Error('index.html is missing its static loading indicator');
    }

    expect(staticIndicator.className).toBe(renderedIndicator.className);
    expect(staticIndicator.getAttribute('role')).toBe(
      renderedIndicator.getAttribute('role'),
    );
    expect(staticIndicator.getAttribute('aria-live')).toBe(
      renderedIndicator.getAttribute('aria-live'),
    );
    expect(staticIndicator.getAttribute('aria-atomic')).toBe(
      renderedIndicator.getAttribute('aria-atomic'),
    );
    expect(
      staticIndicator.style.getPropertyValue(
        '--loading-indicator-reveal-delay',
      ),
    ).toBe(
      renderedIndicator.style.getPropertyValue(
        '--loading-indicator-reveal-delay',
      ),
    );
    expect(
      staticIndicator.style.getPropertyValue('--loading-note-stagger'),
    ).toBe(
      renderedIndicator.style.getPropertyValue('--loading-note-stagger'),
    );
    // Compared per-child rather than as one flattened string: the
    // hand-formatted markup has insignificant whitespace text nodes
    // between the three spans that the rendered fragment doesn't, and
    // that difference isn't the thing this test is guarding.
    expect(childText(staticIndicator)).toEqual(childText(renderedIndicator));
  });
});

function childText(element: HTMLElement): Array<string | null> {
  return Array.from(element.children).map((child) => child.textContent);
}
