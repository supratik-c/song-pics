import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnchoredDialogController } from './anchoredDialog.ts';

// happy-dom's showModal() only sets the `open` attribute — there is no real
// top-layer/inertness, and dispatching a 'cancel' event does not trigger any
// native default action (unlike a real browser, where Escape both fires
// 'cancel' and, unless prevented, closes the dialog on its own). These
// tests therefore assert *what this module wrote* (attributes, custom
// properties, focus target, DOM presence/absence) and *how it responds* to
// dispatched events, not real browser positioning or inertness — those are
// manual-verification-only guarantees, covered in the plan's verification
// pass instead.
//
// Deliberately no accept/decline vocabulary anywhere in this file: that
// absence is itself the check that this module stayed generic and reusable
// rather than becoming an artist-reveal implementation detail.

afterEach(() => {
  document.body.innerHTML = '';
});

function createView(overrides: Partial<Parameters<
  ReturnType<typeof createAnchoredDialogController>['open']
>[0]> = {}) {
  const anchor = document.createElement('button');
  const message = document.createElement('p');
  message.id = 'popover-message';
  message.textContent = 'Hello';
  const content = document.createDocumentFragment();
  content.append(message);

  document.body.append(anchor);

  return {
    anchor,
    returnFocus: anchor,
    content,
    className: 'test-popover',
    labelledBy: 'popover-message',
    ...overrides,
  };
}

describe('createAnchoredDialogController', () => {
  it('appends the dialog with the shared shell class plus the caller class, and labels it', () => {
    const controller = createAnchoredDialogController();
    const view = createView();

    controller.open(view);

    const dialog = document.querySelector('dialog');

    expect(dialog).not.toBeNull();
    expect(dialog?.classList.contains('anchored-popover')).toBe(true);
    expect(dialog?.classList.contains('test-popover')).toBe(true);
    expect(dialog?.getAttribute('aria-labelledby')).toBe('popover-message');
    expect(dialog?.contains(document.getElementById('popover-message'))).toBe(
      true,
    );
  });

  it('sets a placement dataset and the three geometry custom properties', () => {
    const controller = createAnchoredDialogController();

    controller.open(createView());

    const dialog = document.querySelector('dialog') as HTMLDialogElement;

    expect(['above', 'below']).toContain(dialog.dataset.placement);
    expect(dialog.style.getPropertyValue('--anchored-popover-top')).not.toBe(
      '',
    );
    expect(dialog.style.getPropertyValue('--anchored-popover-left')).not.toBe(
      '',
    );
    expect(
      dialog.style.getPropertyValue('--anchored-popover-tail-offset'),
    ).not.toBe('');
  });

  it('focuses the dialog container itself, not a descendant', () => {
    const controller = createAnchoredDialogController();
    const focusable = document.createElement('button');
    const content = document.createDocumentFragment();
    const message = document.createElement('p');

    message.id = 'popover-message-2';
    content.append(message, focusable);

    controller.open(createView({ content, labelledBy: 'popover-message-2' }));

    const dialog = document.querySelector('dialog');

    expect(document.activeElement).toBe(dialog);
  });

  it('reports isOpen() across the open/close lifecycle', () => {
    const controller = createAnchoredDialogController();

    expect(controller.isOpen()).toBe(false);

    controller.open(createView());
    expect(controller.isOpen()).toBe(true);

    controller.close();
    expect(controller.isOpen()).toBe(false);
  });

  it('close() removes the dialog, restores focus, and calls onClose exactly once', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();
    const view = createView({ onClose });

    view.anchor.focus();
    controller.open(view);
    controller.close();

    expect(document.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(view.anchor);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a view with no onClose closes cleanly', () => {
    const controller = createAnchoredDialogController();

    controller.open(createView());

    expect(() => controller.close()).not.toThrow();
  });

  it('a dispatched cancel event closes the popover and calls onClose once', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();

    controller.open(createView({ onClose }));

    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(controller.isOpen()).toBe(false);
    expect(document.querySelector('dialog')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a click with target === dialog closes the popover', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();

    controller.open(createView({ onClose }));

    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(controller.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a click on inner content does not close the popover', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();
    const view = createView({ onClose });

    controller.open(view);

    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    const message = dialog.querySelector('#popover-message') as HTMLElement;
    message.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(controller.isOpen()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismissible: false makes cancel and outside-click no-ops, while explicit close() still works', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();

    controller.open(createView({ dismissible: false, onClose }));

    const dialog = document.querySelector('dialog') as HTMLDialogElement;

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(controller.isOpen()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    controller.close();

    expect(controller.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('setDismissible(false) after open() suppresses cancel and outside-click even though dismissible was not passed at open time, while explicit close() still works', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();

    controller.open(createView({ onClose }));
    controller.setDismissible(false);

    const dialog = document.querySelector('dialog') as HTMLDialogElement;

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(controller.isOpen()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    controller.close();

    expect(controller.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('setDismissible() is a no-op when nothing is open', () => {
    const controller = createAnchoredDialogController();

    expect(() => controller.setDismissible(false)).not.toThrow();
    expect(controller.isOpen()).toBe(false);
  });

  it('close() before open() is a no-op', () => {
    const controller = createAnchoredDialogController();

    expect(() => controller.close()).not.toThrow();
    expect(controller.isOpen()).toBe(false);
  });

  it('a second close() call does not call onClose again', () => {
    const onClose = vi.fn();
    const controller = createAnchoredDialogController();

    controller.open(createView({ onClose }));
    controller.close();
    controller.close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a second open() while already open is a no-op', () => {
    const controller = createAnchoredDialogController();

    controller.open(createView({ className: 'first-popover' }));
    controller.open(createView({ className: 'second-popover' }));

    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    expect(
      document.querySelector('dialog')?.classList.contains('first-popover'),
    ).toBe(true);
  });
});
