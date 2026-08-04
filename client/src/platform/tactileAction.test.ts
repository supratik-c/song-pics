import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAfterTactileActivation } from './tactileAction.ts';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('tactile activation', () => {
  it('waits for the activation animation before running the action', () => {
    stubReducedMotion(false);
    const button = document.createElement('button');
    const action = vi.fn();

    runAfterTactileActivation(button, action);

    expect(button.classList.contains('is-tactile-activating')).toBe(true);
    expect(action).not.toHaveBeenCalled();

    button.dispatchEvent(new Event('animationend'));

    expect(button.classList.contains('is-tactile-activating')).toBe(false);
    expect(action).toHaveBeenCalledOnce();
  });

  it('ignores repeat activation while the first action is pending', () => {
    stubReducedMotion(false);
    const button = document.createElement('button');
    const firstAction = vi.fn();
    const repeatAction = vi.fn();

    runAfterTactileActivation(button, firstAction);
    runAfterTactileActivation(button, repeatAction);
    button.dispatchEvent(new Event('animationend'));

    expect(firstAction).toHaveBeenCalledOnce();
    expect(repeatAction).not.toHaveBeenCalled();
  });

  it('runs the action if the animation is cancelled', () => {
    stubReducedMotion(false);
    const button = document.createElement('button');
    const action = vi.fn();

    runAfterTactileActivation(button, action);
    button.dispatchEvent(new Event('animationcancel'));

    expect(action).toHaveBeenCalledOnce();
  });

  it('uses a fallback when no animation event is emitted', () => {
    vi.useFakeTimers();
    stubReducedMotion(false);
    const button = document.createElement('button');
    const action = vi.fn();

    runAfterTactileActivation(button, action);
    vi.runAllTimers();

    expect(action).toHaveBeenCalledOnce();
    expect(button.classList.contains('is-tactile-activating')).toBe(false);
  });

  it('runs immediately when reduced motion is preferred', () => {
    stubReducedMotion(true);
    const button = document.createElement('button');
    const action = vi.fn();

    runAfterTactileActivation(button, action);

    expect(action).toHaveBeenCalledOnce();
    expect(button.classList.contains('is-tactile-activating')).toBe(false);
  });
});

function stubReducedMotion(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
  } as MediaQueryList);
}
