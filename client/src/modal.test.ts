import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createModalController,
  type ModalElements,
} from './modal.ts';

class FakeClassList {
  private readonly values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }

  remove(value: string): void {
    this.values.delete(value);
  }
}

class FakeElement extends EventTarget {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly classList = new FakeClassList();
  className = '';
  inert = false;
  isConnected = true;
  textContent = '';
  focus = vi.fn();

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  toggleAttribute(name: string, force: boolean): void {
    if (force) {
      this.attributes.set(name, '');
    } else {
      this.attributes.delete(name);
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

class FakeDialog extends FakeElement {
  open = false;

  showModal(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }
}

describe('modal busy state', () => {
  it('marks loading content busy and clears it for loaded content', () => {
    const { controller, body, returnFocus } = createFixture();
    const viewId = controller.open({
      title: 'All Issues',
      content: createContent(),
      returnFocus,
      busy: true,
    });

    expect(body.attributes.has('aria-busy')).toBe(true);

    controller.update(viewId, { content: createContent() });

    expect(body.attributes.has('aria-busy')).toBe(false);
  });

  it('clears busy state when an error replaces loading content', () => {
    const { controller, body, returnFocus } = createFixture();
    const viewId = controller.open({
      title: 'How to Play',
      content: createContent(),
      returnFocus,
      busy: true,
    });

    controller.update(viewId, {
      content: createContent(),
      busy: false,
    });

    expect(body.attributes.has('aria-busy')).toBe(false);
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
      title: 'All Issues',
      content: archiveContent,
      returnFocus,
    });

    vi.stubGlobal('document', {
      createElement: () => new FakeElement(),
    });
    closeButton.focus.mockClear();

    expect(controller.showBusyOverlay(viewId, overlayContent)).toBe(true);

    const retainedContent = body.children[0];
    const overlay = body.children[1];

    expect(retainedContent).toBe(archiveContent);
    expect(retainedContent.inert).toBe(true);
    expect(retainedContent.attributes.get('aria-hidden')).toBe('true');
    expect(overlay.className).toBe('comic-dialog-busy-overlay');
    expect(overlay.children[0]).toBe(overlayContent);
    expect(
      body.classList.contains('comic-dialog-body-has-busy-overlay'),
    ).toBe(true);
    expect(body.attributes.has('aria-busy')).toBe(true);
    expect(closeButton.focus).toHaveBeenCalledOnce();
    expect(controller.showBusyOverlay(viewId, createContent())).toBe(false);

    dialog.close();

    expect(body.children).toHaveLength(0);
    expect(
      body.classList.contains('comic-dialog-body-has-busy-overlay'),
    ).toBe(false);
    expect(body.attributes.has('aria-busy')).toBe(false);
  });

  it('does not overlay an obsolete view', () => {
    const { controller, returnFocus } = createFixture();
    const viewId = controller.open({
      title: 'All Issues',
      content: createContent(),
      returnFocus,
    });

    expect(controller.showBusyOverlay(viewId + 1, createContent())).toBe(false);
  });
});

function createFixture(): {
  controller: ReturnType<typeof createModalController>;
  body: FakeElement;
  closeButton: FakeElement;
  dialog: FakeDialog;
  returnFocus: HTMLElement;
} {
  const dialog = new FakeDialog();
  const title = new FakeElement();
  const body = new FakeElement();
  const closeButton = new FakeElement();
  const returnFocus = new FakeElement() as unknown as HTMLElement;
  const elements = {
    dialog,
    title,
    body,
    closeButton,
  } as unknown as ModalElements;

  return {
    controller: createModalController(elements),
    body,
    closeButton,
    dialog,
    returnFocus,
  };
}

function createContent(): DocumentFragment {
  return new FakeElement() as unknown as DocumentFragment;
}
