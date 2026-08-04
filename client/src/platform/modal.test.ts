import { describe, expect, it, vi } from 'vitest';
import {
  createModalController,
  type ModalElements,
} from './modal.ts';

describe('modal busy state', () => {
  it('marks loading content busy and clears it for loaded content', () => {
    const { controller, body, returnFocus } = createFixture();
    const viewId = controller.open({
      title: 'All Releases',
      content: createContent().fragment,
      returnFocus,
      busy: true,
    });

    expect(body.hasAttribute('aria-busy')).toBe(true);

    controller.update(viewId, { content: createContent().fragment });

    expect(body.hasAttribute('aria-busy')).toBe(false);
  });

  it('clears busy state when an error replaces loading content', () => {
    const { controller, returnFocus, body } = createFixture();
    const viewId = controller.open({
      title: 'How to Play',
      content: createContent().fragment,
      returnFocus,
      busy: true,
    });

    controller.update(viewId, {
      content: createContent().fragment,
      busy: false,
    });

    expect(body.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows a busy overlay without replacing or resizing existing content', () => {
    const {
      body,
      closeButton,
      controller,
      dialog,
      returnFocus,
    } = createFixture();
    const archiveContent = createContent();
    const overlayContent = createContent();
    const viewId = controller.open({
      title: 'All Releases',
      content: archiveContent.fragment,
      returnFocus,
    });
    const focusSpy = vi.spyOn(closeButton, 'focus');

    expect(controller.showBusyOverlay(viewId, overlayContent.fragment)).toBe(
      true,
    );

    const retainedContent = body.children[0] as HTMLElement;
    const overlay = body.children[1] as HTMLElement;

    expect(retainedContent).toBe(archiveContent.node);
    expect(retainedContent.inert).toBe(true);
    expect(retainedContent.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.className).toBe('comic-dialog-busy-overlay');
    expect(overlay.children[0]).toBe(overlayContent.node);
    expect(
      body.classList.contains('comic-dialog-body-has-busy-overlay'),
    ).toBe(true);
    expect(body.hasAttribute('aria-busy')).toBe(true);
    expect(focusSpy).toHaveBeenCalledOnce();
    expect(
      controller.showBusyOverlay(viewId, createContent().fragment),
    ).toBe(false);

    dialog.close();

    expect(body.children).toHaveLength(0);
    expect(
      body.classList.contains('comic-dialog-body-has-busy-overlay'),
    ).toBe(false);
    expect(body.hasAttribute('aria-busy')).toBe(false);
  });

  it('does not overlay an obsolete view', () => {
    const { controller, returnFocus } = createFixture();
    const viewId = controller.open({
      title: 'All Releases',
      content: createContent().fragment,
      returnFocus,
    });

    expect(
      controller.showBusyOverlay(viewId + 1, createContent().fragment),
    ).toBe(false);
  });
});

function createFixture(): {
  controller: ReturnType<typeof createModalController>;
  body: HTMLElement;
  closeButton: HTMLButtonElement;
  dialog: HTMLDialogElement;
  returnFocus: HTMLElement;
} {
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2');
  const body = document.createElement('div');
  const closeButton = document.createElement('button');
  const returnFocus = document.createElement('button');
  const elements: ModalElements = { dialog, title, body, closeButton };

  return {
    controller: createModalController(elements),
    body,
    closeButton,
    dialog,
    returnFocus,
  };
}

// A DocumentFragment's children move into whatever they're appended to, so
// the fragment itself never appears among a rendered element's children.
// Track the node placed inside it instead, to assert on the identity of
// what actually lands in the DOM.
function createContent(): { fragment: DocumentFragment; node: HTMLElement } {
  const node = document.createElement('span');
  const fragment = document.createDocumentFragment();

  fragment.append(node);
  return { fragment, node };
}
