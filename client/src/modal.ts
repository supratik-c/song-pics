import {
  type ModalElements,
  type ModalTone,
  type ModalView,
} from './types.ts';

type ModalUpdate = {
  title?: string;
  content: DocumentFragment;
  onClose?: () => void;
  tone?: ModalTone;
};

export type ModalController = {
  open: (view: ModalView) => number;
  update: (viewId: number, update: ModalUpdate) => boolean;
  close: () => void;
};

export function createModalController(
  elements: ModalElements,
): ModalController {
  let activeViewId = 0;
  let returnFocus: HTMLElement | null = null;
  let onClose: (() => void) | null = null;

  const cleanUpContent = (): void => {
    onClose?.();
    onClose = null;
    elements.body.replaceChildren();
  };

  const finishClose = (): void => {
    const focusTarget = returnFocus;

    cleanUpContent();
    elements.title.textContent = '';
    delete elements.dialog.dataset.tone;
    returnFocus = null;
    activeViewId += 1;

    if (focusTarget?.isConnected) {
      focusTarget.focus();
    }
  };

  elements.closeButton.addEventListener('click', () => {
    elements.dialog.close();
  });
  elements.dialog.addEventListener('close', finishClose);

  const open = (view: ModalView): number => {
    activeViewId += 1;
    cleanUpContent();

    elements.title.textContent = view.title;
    elements.dialog.dataset.tone = view.tone ?? 'default';
    elements.body.append(view.content);
    returnFocus = view.returnFocus;
    onClose = view.onClose ?? null;

    if (!elements.dialog.open) {
      elements.dialog.showModal();
    }

    elements.closeButton.focus();
    return activeViewId;
  };

  const update = (
    viewId: number,
    updateValue: ModalUpdate,
  ): boolean => {
    if (
      viewId !== activeViewId ||
      !elements.dialog.open
    ) {
      return false;
    }

    cleanUpContent();

    if (updateValue.title !== undefined) {
      elements.title.textContent = updateValue.title;
    }

    if (updateValue.tone !== undefined) {
      elements.dialog.dataset.tone = updateValue.tone;
    }

    elements.body.append(updateValue.content);
    onClose = updateValue.onClose ?? null;
    return true;
  };

  return {
    open,
    update,
    close: () => {
      if (elements.dialog.open) {
        elements.dialog.close();
      }
    },
  };
}
