import {
  computeAnchoredPlacement,
  type PlacementOptions,
} from './anchoredPlacement.ts';

// Generic anchored-popover infrastructure — a peer to modal.ts's centered
// dialog system, not a feature detail of any one caller. This module must
// not know why a popover opened or closed; that meaning belongs entirely
// to the caller, expressed with ordinary closures around onClose. A future
// popup that is just copy and a close button is the same controller with
// different injected content.

export type AnchoredDialogView = {
  anchor: HTMLElement;
  returnFocus: HTMLElement;
  content: DocumentFragment;
  // Caller's modifier class, e.g. 'artist-reveal-notice' — layered on top
  // of the shared 'anchored-popover' shell class this module always adds.
  className: string;
  // id of an element inside `content` that describes the popover.
  labelledBy: string;
  // Default true: Escape and an outside/backdrop tap close the popover.
  // Set false for a popup that must be answered via its own content.
  dismissible?: boolean;
  // Fires exactly once, however the popover closed.
  onClose?: () => void;
};

export type AnchoredDialogController = {
  open: (view: AnchoredDialogView) => void;
  close: () => void;
  isOpen: () => boolean;
  // Toggles the open view's dismissibility at runtime, independent of the
  // `dismissible` value passed to open(). A no-op if nothing is open.
  // Generic on purpose — it carries no knowledge of why a caller wants
  // dismissal locked out (e.g. while committing an action started from a
  // deferred tactile-press handler), only that it does.
  setDismissible: (dismissible: boolean) => void;
};

const measuringClass = 'is-measuring';
const sharedClass = 'anchored-popover';

export function createAnchoredDialogController(
  options: { placementOptions?: PlacementOptions } = {},
): AnchoredDialogController {
  let current: {
    dialog: HTMLDialogElement;
    view: AnchoredDialogView;
  } | null = null;

  // Always attached (not just when dismissible) so a non-dismissible
  // popover can block Escape's native close instead of merely declining to
  // add its own. Both handlers read `current.view.dismissible` at call
  // time rather than being conditionally attached, since they are shared
  // per controller instance across every open() call.
  const handleCancel = (event: Event): void => {
    event.preventDefault();

    if (current?.view.dismissible !== false) {
      close();
    }
  };

  const handleClick = (event: MouseEvent): void => {
    if (current?.view.dismissible === false) {
      return;
    }

    if (event.target === current?.dialog) {
      close();
    }
  };

  const open = (view: AnchoredDialogView): void => {
    // Deliberately a no-op rather than modal.ts's replace-on-reopen
    // behavior: a popover mid-confirmation is asking the user to decide
    // something, and silently swapping its content for something unrelated
    // out from under them would be jarring in a way that replacing a
    // still-loading modal's content is not.
    if (current) {
      return;
    }

    const dialog = document.createElement('dialog');

    dialog.className = `${sharedClass} ${view.className}`;
    dialog.tabIndex = -1;
    dialog.setAttribute('aria-labelledby', view.labelledBy);
    dialog.append(view.content);
    dialog.classList.add(measuringClass);
    document.body.append(dialog);
    dialog.showModal();

    const anchorRect = view.anchor.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const placement = computeAnchoredPlacement(
      anchorRect,
      { width: dialogRect.width, height: dialogRect.height },
      {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      options.placementOptions,
    );

    dialog.dataset.placement = placement.direction;
    dialog.style.setProperty('--anchored-popover-top', `${placement.top}px`);
    dialog.style.setProperty('--anchored-popover-left', `${placement.left}px`);
    dialog.style.setProperty(
      '--anchored-popover-tail-offset',
      `${placement.tailOffset}px`,
    );
    dialog.classList.remove(measuringClass);

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleClick);
    current = { dialog, view };
    dialog.focus();
  };

  const close = (): void => {
    if (!current) {
      return;
    }

    const { dialog, view } = current;

    current = null;
    dialog.removeEventListener('cancel', handleCancel);
    dialog.removeEventListener('click', handleClick);

    if (dialog.open) {
      dialog.close();
    }

    dialog.remove();

    if (view.returnFocus.isConnected) {
      view.returnFocus.focus();
    }

    view.onClose?.();
  };

  const setDismissible = (dismissible: boolean): void => {
    if (current) {
      current = { ...current, view: { ...current.view, dismissible } };
    }
  };

  return {
    open,
    close,
    isOpen: () => current !== null,
    setDismissible,
  };
}
