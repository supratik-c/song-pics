import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPanelZoomController } from './panelZoom.ts';

afterEach(() => {
  document.body.innerHTML = '';
  document.body.classList.remove('panel-zoom-open');
});

function setUpPanel(
  controller: ReturnType<typeof createPanelZoomController>,
  panelNumber: number,
): { figure: HTMLElement; button: HTMLButtonElement } {
  const figure = document.createElement('figure');
  const button = document.createElement('button');

  figure.append(button);
  document.body.append(figure);
  controller.configure(figure, button, panelNumber);

  return { figure, button };
}

describe('panel zoom controller', () => {
  it('expands a panel on click and marks it accordingly', () => {
    const controller = createPanelZoomController();
    const { figure, button } = setUpPanel(controller, 1);

    button.click();

    expect(figure.classList.contains('is-expanded')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe(
      'Return clue panel 1 to normal size',
    );
    expect(document.body.classList.contains('panel-zoom-open')).toBe(true);
  });

  it('collapses an expanded panel on a second click', () => {
    const controller = createPanelZoomController();
    const { figure, button } = setUpPanel(controller, 1);

    button.click();
    button.click();

    expect(figure.classList.contains('is-expanded')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Enlarge clue panel 1');
    expect(document.body.classList.contains('panel-zoom-open')).toBe(false);
  });

  it('closes an expanded panel and returns focus on Escape', () => {
    const controller = createPanelZoomController();
    const { figure, button } = setUpPanel(controller, 2);
    const focusSpy = vi.spyOn(button, 'focus');

    button.click();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );

    expect(figure.classList.contains('is-expanded')).toBe(false);
    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it('ignores keys other than Escape', () => {
    const controller = createPanelZoomController();
    const { figure, button } = setUpPanel(controller, 1);

    button.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(figure.classList.contains('is-expanded')).toBe(true);
  });

  it('allows only one expanded panel at a time', () => {
    const controller = createPanelZoomController();
    const first = setUpPanel(controller, 1);
    const second = setUpPanel(controller, 2);

    first.button.click();
    second.button.click();

    expect(first.figure.classList.contains('is-expanded')).toBe(false);
    expect(second.figure.classList.contains('is-expanded')).toBe(true);
  });

  it('closeAny closes whichever panel is currently expanded', () => {
    const controller = createPanelZoomController();
    const { figure, button } = setUpPanel(controller, 1);

    button.click();
    controller.closeAny();

    expect(figure.classList.contains('is-expanded')).toBe(false);
    expect(document.body.classList.contains('panel-zoom-open')).toBe(false);
  });

  it('closeAny is a no-op when nothing is expanded', () => {
    const controller = createPanelZoomController();

    expect(() => controller.closeAny()).not.toThrow();
  });
});
