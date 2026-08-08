import { runAfterTactileActivation } from '../platform/tactileAction.ts';

// All artist/reveal-specific knowledge lives here — platform/anchoredDialog.ts
// and platform/anchoredPlacement.ts stay generic, reusable infrastructure.

export const ARTIST_REVEAL_NOTICE_MESSAGE_ID = 'artist-reveal-notice-message';

const costWords: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
};

export function renderArtistRevealNoticeContent(options: {
  cost: number;
  onAccept: () => void;
  onDecline: () => void;
  // Fires synchronously on either button's click, before the tactile-press
  // delay defers the actual action — the only point where a caller can
  // reliably lock out dismissal before that delay's window opens.
  onCommit: () => void;
}): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const body = document.createElement('div');
  const message = document.createElement('p');
  const costEmphasis = document.createElement('strong');
  const actions = document.createElement('div');
  const acceptButton = document.createElement('button');
  const declineButton = document.createElement('button');
  const costWord = costWords[options.cost] ?? String(options.cost);
  const guessWord = options.cost === 1 ? 'guess' : 'guesses';

  body.className = 'artist-reveal-notice-body';
  message.id = ARTIST_REVEAL_NOTICE_MESSAGE_ID;
  message.className = 'artist-reveal-notice-message';
  message.append('Reveal Artist ');
  costEmphasis.textContent = `uses ${costWord} ${guessWord}`;
  message.append(costEmphasis);

  actions.className = 'artist-reveal-notice-actions';

  acceptButton.type = 'button';
  acceptButton.className =
    'dialog-action-button tactile-button artist-reveal-notice-accept';
  acceptButton.textContent = 'Reveal';
  acceptButton.addEventListener('click', () => {
    options.onCommit();
    runAfterTactileActivation(acceptButton, options.onAccept);
  });

  declineButton.type = 'button';
  declineButton.className =
    'dialog-action-button tactile-button artist-reveal-notice-decline';
  declineButton.textContent = 'No Thanks';
  declineButton.addEventListener('click', () => {
    options.onCommit();
    runAfterTactileActivation(declineButton, options.onDecline);
  });

  actions.append(acceptButton, declineButton);
  body.append(message, actions);
  fragment.append(body);

  return fragment;
}
