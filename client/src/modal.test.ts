import { describe, expect, it, vi } from 'vitest';
import {
  createModalController,
  type ModalElements,
} from './modal.ts';

class FakeElement extends EventTarget {
  readonly attributes = new Map<string, string>();
  readonly children: unknown[] = [];
  isConnected = true;
  textContent = '';
  focus = vi.fn();

  append(...nodes: unknown[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: unknown[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  toggleAttribute(name: string, force: boolean): void {
    if (force) {
      this.attributes.set(name, '');
    } else {
      this.attributes.delete(name);
    }
  }
}

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
});

function createFixture(): {
  controller: ReturnType<typeof createModalController>;
  body: FakeElement;
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
    returnFocus,
  };
}

function createContent(): DocumentFragment {
  return new FakeElement() as unknown as DocumentFragment;
}
