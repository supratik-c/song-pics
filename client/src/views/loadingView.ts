export type LoadingIndicatorSize = 'medium' | 'large';

export type LoadingIndicatorOptions = {
  label?: string;
  size?: LoadingIndicatorSize;
  noteStaggerMs?: number;
  revealDelayMs?: number;
};

const defaultNoteStaggerMs = 180;
const defaultRevealDelayMs = 250;

export function renderLoadingIndicator({
  label = 'Scribbling...',
  size = 'medium',
  noteStaggerMs = defaultNoteStaggerMs,
  revealDelayMs = defaultRevealDelayMs,
}: LoadingIndicatorOptions = {}): DocumentFragment {
  const content = document.createDocumentFragment();
  const indicator = document.createElement('p');
  const leadingNote = createNote();
  const text = document.createElement('span');
  const trailingNote = createNote('loading-indicator-note-trailing');
  const safeNoteStaggerMs = Number.isFinite(noteStaggerMs) && noteStaggerMs >= 0
    ? noteStaggerMs
    : defaultNoteStaggerMs;
  const safeRevealDelayMs = Number.isFinite(revealDelayMs) && revealDelayMs >= 0
    ? revealDelayMs
    : defaultRevealDelayMs;

  indicator.className = `loading-indicator loading-indicator-${size}`;
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.setAttribute('aria-atomic', 'true');
  indicator.style.setProperty(
    '--loading-note-stagger',
    `${safeNoteStaggerMs}ms`,
  );
  indicator.style.setProperty(
    '--loading-indicator-reveal-delay',
    `${safeRevealDelayMs}ms`,
  );
  text.textContent = label;
  indicator.append(leadingNote, text, trailingNote);
  content.append(indicator);

  return content;
}

function createNote(extraClass?: string): HTMLSpanElement {
  const note = document.createElement('span');

  note.className = extraClass
    ? `loading-indicator-note ${extraClass}`
    : 'loading-indicator-note';
  note.textContent = '♪';
  note.setAttribute('aria-hidden', 'true');
  return note;
}
