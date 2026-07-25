import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderShareControl } from './shareView.ts';

class FakeElement {
  readonly children: Array<FakeElement | FakeText> = [];
  readonly classList = { add: vi.fn() };
  disabled = false;
  href = '';
  textContent = '';
  type = '';
  private readonly listeners = new Map<string, () => void>();

  append(...nodes: Array<FakeElement | FakeText>): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: Array<FakeElement | FakeText>): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  setAttribute(): void {}

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  click(): void {
    this.listeners.get('click')?.();
  }
}

class FakeText {
  constructor(readonly textContent: string) {}
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('share control', () => {
  it('leaves an operable link when sharing and copying fail', async () => {
    vi.stubGlobal('document', {
      createElement: () => new FakeElement(),
      createElementNS: () => new FakeElement(),
      createTextNode: (value: string) => new FakeText(value),
    });

    const shareUrl = 'https://example.test/share/2026-07-23/';
    const control = renderShareControl({
      fallbackUrl: shareUrl,
      getRequest: () => ({
        title: 'Scribble Bops',
        text: 'A spoiler-free invitation',
        url: shareUrl,
      }),
      share: vi.fn().mockResolvedValue('failed'),
    }) as unknown as FakeElement;
    const [button, status] = control.children as [FakeElement, FakeElement];

    button.click();

    await vi.waitFor(() => {
      expect(status.children).toHaveLength(2);
    });

    const [message, link] = status.children as [FakeText, FakeElement];

    expect(message.textContent).toBe(
      'The invite could not be shared or copied. ',
    );
    expect(link.textContent).toBe('Open the share link.');
    expect(link.href).toBe(shareUrl);
    expect(button.disabled).toBe(false);
  });
});
