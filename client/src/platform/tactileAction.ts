const activationClass = 'is-tactile-activating';
const activationFallbackMilliseconds = 250;
const pendingButtons = new WeakSet<HTMLButtonElement>();

export function runAfterTactileActivation(
  button: HTMLButtonElement,
  action: () => void,
): void {
  if (pendingButtons.has(button)) {
    return;
  }

  if (prefersReducedMotion()) {
    action();
    return;
  }

  pendingButtons.add(button);
  button.classList.add(activationClass);

  let fallbackId: ReturnType<typeof setTimeout>;
  let finished = false;

  const finish = (): void => {
    if (finished) {
      return;
    }

    finished = true;
    clearTimeout(fallbackId);
    button.removeEventListener('animationend', handleAnimationEnd);
    button.removeEventListener('animationcancel', handleAnimationEnd);
    button.classList.remove(activationClass);
    pendingButtons.delete(button);
    action();
  };

  const handleAnimationEnd = (event: Event): void => {
    if (event.target === button) {
      finish();
    }
  };

  button.addEventListener('animationend', handleAnimationEnd);
  button.addEventListener('animationcancel', handleAnimationEnd);
  fallbackId = setTimeout(finish, activationFallbackMilliseconds);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
