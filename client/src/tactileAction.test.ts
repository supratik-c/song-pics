import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAfterTactileActivation } from './tactileAction.ts';

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

class FakeButton extends EventTarget {
  readonly classList = new FakeClassList();
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('tactile activation', () => {
  it('waits for the activation animation before running the action', () => {
    stubReducedMotion(false);
    const button = new FakeButton();
    const action = vi.fn();

    runAfterTactileActivation(
      button as unknown as HTMLButtonElement,
      action,
    );

    expect(button.classList.contains('is-tactile-activating')).toBe(true);
    expect(action).not.toHaveBeenCalled();

    button.dispatchEvent(new Event('animationend'));

    expect(button.classList.contains('is-tactile-activating')).toBe(false);
    expect(action).toHaveBeenCalledOnce();
  });

  it('ignores repeat activation while the first action is pending', () => {
    stubReducedMotion(false);
    const button = new FakeButton();
    const firstAction = vi.fn();
    const repeatAction = vi.fn();

    runAfterTactileActivation(
      button as unknown as HTMLButtonElement,
      firstAction,
    );
    runAfterTactileActivation(
      button as unknown as HTMLButtonElement,
      repeatAction,
    );
    button.dispatchEvent(new Event('animationend'));

    expect(firstAction).toHaveBeenCalledOnce();
    expect(repeatAction).not.toHaveBeenCalled();
  });

  it('runs the action if the animation is cancelled', () => {
    stubReducedMotion(false);
    const button = new FakeButton();
    const action = vi.fn();

    runAfterTactileActivation(
      button as unknown as HTMLButtonElement,
      action,
    );
    button.dispatchEvent(new Event('animationcancel'));

    expect(action).toHaveBeenCalledOnce();
  });

  it('uses a fallback when no animation event is emitted', () => {
    vi.useFakeTimers();
    stubReducedMotion(false);
    const button = new FakeButton();
    const action = vi.fn();

    runAfterTactileActivation(
      button as unknown as HTMLButtonElement,
      action,
    );
    vi.runAllTimers();

    expect(action).toHaveBeenCalledOnce();
    expect(button.classList.contains('is-tactile-activating')).toBe(false);
  });

  it('runs immediately when reduced motion is preferred', () => {
    stubReducedMotion(true);
    const button = new FakeButton();
    const action = vi.fn();

    runAfterTactileActivation(
      button as unknown as HTMLButtonElement,
      action,
    );

    expect(action).toHaveBeenCalledOnce();
    expect(button.classList.contains('is-tactile-activating')).toBe(false);
  });
});

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches }),
  });
}
