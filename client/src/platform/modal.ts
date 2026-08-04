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
  busy?: boolean;
};

type ModalUpdate = {
  title?: string;
  content: DocumentFragment;
  busy?: boolean;
};

export type ModalController = {
  open: (view: ModalView) => number;
  update: (viewId: number, update: ModalUpdate) => boolean;
  showBusyOverlay: (viewId: number, content: DocumentFragment) => boolean;
  close: () => void;
};

const busyOverlayClass = 'comic-dialog-body-has-busy-overlay';

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
    elements.body.classList.remove(busyOverlayClass);
    elements.body.removeAttribute('aria-busy');
  };

  const renderContent = (
    content: DocumentFragment,
    busy = false,
  ): void => {
    elements.body.append(content);
    elements.body.toggleAttribute('aria-busy', busy);
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
    renderContent(view.content, view.busy);
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

    renderContent(updateValue.content, updateValue.busy);
    return true;
  };

  const showBusyOverlay = (
    viewId: number,
    content: DocumentFragment,
  ): boolean => {
    if (
      viewId !== activeViewId ||
      !elements.dialog.open ||
      elements.body.classList.contains(busyOverlayClass)
    ) {
      return false;
    }

    const existingContent = Array.from(elements.body.children);
    const overlay = document.createElement('div');

    elements.closeButton.focus();
    existingContent.forEach((element) => {
      const htmlElement = element as HTMLElement;

      htmlElement.inert = true;
      htmlElement.setAttribute('aria-hidden', 'true');
    });
    overlay.className = 'comic-dialog-busy-overlay';
    overlay.append(content);
    elements.body.classList.add(busyOverlayClass);
    elements.body.setAttribute('aria-busy', 'true');
    elements.body.append(overlay);
    return true;
  };

  return {
    open,
    update,
    showBusyOverlay,
    close: () => {
      if (elements.dialog.open) {
        elements.dialog.close();
      }
    },
  };
}
