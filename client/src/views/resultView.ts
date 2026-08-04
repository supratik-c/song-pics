import { getYouTubeVideoId } from '../../shared/youtubeVideoId.mjs';
import type { GameStatus, PuzzleSolution } from '../domain/types.ts';

export type YouTubeVideoUrls = {
  embedUrl: string;
  watchUrl: string;
};

export type YouTubeConsent = {
  hasConsent: boolean;
  grantConsent: () => void;
};

export function renderResult(
  region: HTMLElement,
  solution: PuzzleSolution,
  status: Exclude<GameStatus, 'playing'>,
  youtubeConsent: YouTubeConsent,
): void {
  const title = document.createElement('h3');
  const body = document.createElement('div');
  const message = document.createElement('p');
  const answer = document.createElement('p');

  title.id = 'puzzle-result-title';
  title.className = 'result-banner';
  body.className = 'result-body';
  message.className = 'result-message';
  answer.className = 'result-answer';
  answer.textContent = `${solution.songTitle} by ${solution.artist}`;

  if (status === 'solved') {
    title.textContent = 'Correct!';
    message.textContent = 'You decoded the doodles.';
  } else if (status === 'revealed') {
    title.textContent = 'Song Revealed';
    message.textContent =
      'The scribbles win this round. The song was:';
  } else {
    title.textContent = 'Out of Guesses';
    message.textContent = 'That was your last guess. The song was:';
  }

  body.append(message, answer);

  if (status !== 'failed' && solution.youtubeURL) {
    body.append(createYouTubeControl(
      solution.youtubeURL,
      solution,
      youtubeConsent,
    ));
  }

  region.dataset.outcome = status;
  region.replaceChildren(title, body);
  region.hidden = false;
}

export function clearResult(region: HTMLElement): void {
  region.hidden = true;
  delete region.dataset.outcome;
  region.replaceChildren();
}

export function focusCompletedResult(region: HTMLElement): void {
  region.focus({ preventScroll: true });

  window.requestAnimationFrame(() => {
    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const behavior = prefersReducedMotion
      ? 'auto'
      : 'smooth';

    window.scrollTo({ top: scrollHeight, behavior });
  });
}

export function getYouTubeVideoUrls(url: string): YouTubeVideoUrls | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null;
    }

    const videoId = getYouTubeVideoId(parsedUrl);

    if (!videoId) {
      return null;
    }

    const encodedVideoId = encodeURIComponent(videoId);

    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodedVideoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${encodedVideoId}`,
    };
  } catch {
    return null;
  }
}

function createYouTubeControl(
  youtubeUrl: string,
  solution: PuzzleSolution,
  youtubeConsent: YouTubeConsent,
): HTMLElement {
  const urls = getYouTubeVideoUrls(youtubeUrl);

  if (!urls) {
    const unavailable = document.createElement('p');

    unavailable.className = 'result-video-unavailable';
    unavailable.textContent = 'The YouTube video is unavailable.';
    console.error('Invalid YouTube URL for terminal result.');
    return unavailable;
  }

  const control = document.createElement('div');
  const frame = document.createElement('div');
  let loaded = false;

  control.className = 'result-video-control';
  frame.className = 'result-video-frame';
  control.append(frame);

  const loadVideo = (shouldFocus: boolean): void => {
    if (loaded) {
      return;
    }

    loaded = true;
    const iframe = createYouTubeVideo(urls.embedUrl, solution);
    const watchLink = createYouTubeWatchLink(urls.watchUrl);

    frame.replaceChildren(iframe);
    control.append(watchLink);

    if (shouldFocus) {
      iframe.focus();
    }
  };

  if (youtubeConsent.hasConsent) {
    loadVideo(false);
    return control;
  }

  const prompt = document.createElement('div');
  const loadButton = document.createElement('button');
  const label = document.createElement('span');
  const privacy = document.createElement('p');
  const privacyPrefix = document.createElement('span');
  const privacyLink = document.createElement('a');

  prompt.className = 'youtube-load-prompt';
  loadButton.type = 'button';
  loadButton.className = 'youtube-load-button tactile-button';
  label.textContent = 'Watch YouTube Video';
  privacy.className = 'youtube-privacy-notice';
  privacyPrefix.textContent = 'Subject to ';
  privacyLink.href = 'https://policies.google.com/privacy';
  privacyLink.target = '_blank';
  privacyLink.rel = 'noopener noreferrer';
  privacyLink.textContent = "Google's Privacy Policy";
  loadButton.append(createYouTubePlayIcon(), label);
  privacy.append(privacyPrefix, privacyLink);
  prompt.append(loadButton, privacy);
  frame.append(prompt);

  loadButton.addEventListener('click', () => {
    youtubeConsent.grantConsent();
    loadVideo(true);
  });

  return control;
}

function createYouTubeVideo(
  embedUrl: string,
  solution: PuzzleSolution,
): HTMLIFrameElement {
  const iframe = document.createElement('iframe');

  iframe.className = 'result-video';
  iframe.src = embedUrl;
  iframe.title =
    `YouTube video player: ${solution.songTitle} by ${solution.artist}`;
  iframe.allow = 'encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  return iframe;
}

function createYouTubeWatchLink(watchUrl: string): HTMLAnchorElement {
  const link = document.createElement('a');
  const label = document.createElement('span');

  link.className = 'youtube-watch-link tactile-button';
  link.href = watchUrl;
  label.textContent = 'Watch on YouTube';
  link.append(createYouTubePlayIcon(), label);
  return link;
}

function createYouTubePlayIcon(): HTMLSpanElement {
  const icon = document.createElement('span');

  icon.className = 'youtube-play-icon';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}
