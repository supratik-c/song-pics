import type {
  PreferredShareAction,
  PuzzleShareRequest,
  ShareOutcome,
} from '../share.ts';

type ShareControlOptions = {
  request: PuzzleShareRequest;
  preferredAction: PreferredShareAction;
  share: () => Promise<ShareOutcome>;
};

export function renderShareControl(
  options: ShareControlOptions,
): HTMLElement {
  const control = document.createElement('section');
  const button = document.createElement('button');
  const label = document.createElement('span');
  const status = document.createElement('p');
  const idleLabel = options.preferredAction === 'native-share'
    ? 'Share puzzle'
    : 'Copy invite';
  const busyLabel = options.preferredAction === 'native-share'
    ? 'Opening share...'
    : 'Copying invite...';

  control.className = 'share-control';
  button.type = 'button';
  button.className = 'share-button tactile-button';
  label.className = 'share-button-label';
  label.textContent = idleLabel;
  status.className = 'share-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  button.append(createShareIcon(), label);
  control.append(button, status);

  button.addEventListener('click', () => {
    button.disabled = true;
    label.textContent = busyLabel;
    status.replaceChildren();

    void options.share().then((outcome) => {
      renderShareOutcome(status, outcome, options.request.url);
    }).catch(() => {
      renderShareOutcome(status, 'failed', options.request.url);
    }).finally(() => {
      button.disabled = false;
      label.textContent = idleLabel;
    });
  });

  return control;
}

function renderShareOutcome(
  status: HTMLElement,
  outcome: ShareOutcome,
  fallbackUrl: string,
): void {
  if (outcome === 'shared') {
    status.textContent = 'Sent to your chosen app.';
  } else if (outcome === 'copied') {
    status.textContent = 'Invite copied — paste it anywhere.';
  } else if (outcome === 'cancelled') {
    status.textContent = '';
  } else {
    const message = document.createTextNode(
      'The invite could not be shared or copied. ',
    );
    const link = document.createElement('a');

    link.href = fallbackUrl;
    link.textContent = 'Open the share link.';
    status.append(message, link);
  }
}

function createShareIcon(): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  const upperLine = document.createElementNS(namespace, 'line');
  const lowerLine = document.createElementNS(namespace, 'line');
  const points = [
    [8, 16],
    [24, 8],
    [24, 24],
  ];

  svg.classList.add('share-icon');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('aria-hidden', 'true');
  upperLine.setAttribute('x1', '10');
  upperLine.setAttribute('y1', '15');
  upperLine.setAttribute('x2', '22');
  upperLine.setAttribute('y2', '9');
  lowerLine.setAttribute('x1', '10');
  lowerLine.setAttribute('y1', '17');
  lowerLine.setAttribute('x2', '22');
  lowerLine.setAttribute('y2', '23');
  svg.append(upperLine, lowerLine);

  for (const [cx, cy] of points) {
    const circle = document.createElementNS(namespace, 'circle');

    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '4');
    svg.append(circle);
  }

  return svg;
}
