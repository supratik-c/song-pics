export type LoadingIndicatorSize = 'small' | 'medium' | 'large';

export type LoadingIndicatorOptions = {
  label?: string;
  size?: LoadingIndicatorSize;
  noteStaggerMs?: number;
};

const defaultNoteStaggerMs = 180;

export function renderLoadingIndicator({
  label = 'Scribbling...',
  size = 'medium',
  noteStaggerMs = defaultNoteStaggerMs,
}: LoadingIndicatorOptions = {}): DocumentFragment {
  const content = document.createDocumentFragment();
  const indicator = document.createElement('p');
  const leadingNote = createNote('loading-indicator-note-leading');
  const text = document.createElement('span');
  const trailingNote = createNote('loading-indicator-note-trailing');
  const safeNoteStaggerMs = Number.isFinite(noteStaggerMs) && noteStaggerMs >= 0
    ? noteStaggerMs
    : defaultNoteStaggerMs;

  indicator.className = `loading-indicator loading-indicator-${size}`;
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.setAttribute('aria-atomic', 'true');
  indicator.style.setProperty(
    '--loading-note-stagger',
    `${safeNoteStaggerMs}ms`,
  );
  text.className = 'loading-indicator-label';
  text.textContent = label;
  indicator.append(leadingNote, text, trailingNote);
  content.append(indicator);

  return content;
}

function createNote(extraClass: string): HTMLSpanElement {
  const note = document.createElement('span');

  note.className = `loading-indicator-note ${extraClass}`;
  note.textContent = '♪';
  note.setAttribute('aria-hidden', 'true');
  return note;
}
