export type ModalElements = {
  dialog: HTMLDialogElement;
  title: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLButtonElement;
};

export type ModalView = {
  title: string;
  content: DocumentFragment;
  returnFocus: HTMLElement;
};

type ModalUpdate = {
  title?: string;
  content: DocumentFragment;
};

export type ModalController = {
  open: (view: ModalView) => number;
  update: (viewId: number, update: ModalUpdate) => boolean;
  close: () => void;
};

export function renderModalMessage(
  message: string,
  kind: 'loading' | 'error' = 'loading',
): DocumentFragment {
  const content = document.createDocumentFragment();
  const paragraph = document.createElement('p');

  paragraph.className = `dialog-message dialog-message-${kind}`;
  paragraph.textContent = message;
  content.append(paragraph);

  return content;
}

export function createModalController(
  elements: ModalElements,
): ModalController {
  let activeViewId = 0;
  let returnFocus: HTMLElement | null = null;

  const cleanUpContent = (): void => {
    elements.body.replaceChildren();
  };

  const finishClose = (): void => {
    const focusTarget = returnFocus;

    cleanUpContent();
    elements.title.textContent = '';
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
    elements.body.append(view.content);
    returnFocus = view.returnFocus;

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

    elements.body.append(updateValue.content);
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
