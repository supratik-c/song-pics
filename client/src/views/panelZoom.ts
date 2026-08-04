// Panel zoom is a self-contained UI behaviour (expand/collapse a single
// clue panel, no game state involved) with one real invariant: at most one
// panel can be expanded at a time. That invariant needs a place to live —
// this factory gives it one instance-scoped closure instead of a module
// level global, so puzzleView.ts holds only a reference, not the behaviour.

export type PanelZoomController = {
  configure: (
    figure: HTMLElement,
    button: HTMLButtonElement,
    panelNumber: number,
  ) => void;
  closeAny: () => void;
};

export function createPanelZoomController(): PanelZoomController {
  let closeExpandedPanel: (() => void) | null = null;

  const configure = (
    figure: HTMLElement,
    button: HTMLButtonElement,
    panelNumber: number,
  ): void => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      close();
      button.focus();
    };

    const close = (): void => {
      figure.classList.remove('is-expanded');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', `Enlarge clue panel ${panelNumber}`);
      document.body.classList.remove('panel-zoom-open');
      document.removeEventListener('keydown', handleEscape);

      if (closeExpandedPanel === close) {
        closeExpandedPanel = null;
      }
    };

    const open = (): void => {
      closeExpandedPanel?.();
      figure.classList.add('is-expanded');
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute(
        'aria-label',
        `Return clue panel ${panelNumber} to normal size`,
      );
      document.body.classList.add('panel-zoom-open');
      document.addEventListener('keydown', handleEscape);
      closeExpandedPanel = close;
    };

    button.addEventListener('click', () => {
      if (figure.classList.contains('is-expanded')) {
        close();
      } else {
        open();
      }
    });
  };

  const closeAny = (): void => {
    closeExpandedPanel?.();
  };

  return { configure, closeAny };
}
