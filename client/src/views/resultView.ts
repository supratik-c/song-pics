import type { GameStatus, PuzzleSolution } from '../types.ts';

export function renderResult(
  region: HTMLElement,
  solution: PuzzleSolution,
  status: Exclude<GameStatus, 'playing'>,
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
    const video = createYouTubeVideo(solution.youtubeURL);

    if (video) {
      body.append(video);
    }
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

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    let videoId: string | null = null;

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null;
    }

    if (parsedUrl.hostname === 'youtu.be') {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

      videoId = pathParts.length === 1 ? pathParts[0] : null;
    } else if (
      parsedUrl.hostname === 'youtube.com' ||
      parsedUrl.hostname === 'www.youtube.com'
    ) {
      videoId = parsedUrl.searchParams.get('v');

      if (!videoId && parsedUrl.pathname.startsWith('/embed/')) {
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

        videoId = pathParts.length === 2 && pathParts[0] === 'embed'
          ? pathParts[1]
          : null;
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return null;
  }
}

function createYouTubeVideo(
  youtubeUrl: string,
): HTMLIFrameElement | null {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  if (!embedUrl) {
    console.error(`Invalid YouTube URL: ${youtubeUrl}`);
    return null;
  }

  const iframe = document.createElement('iframe');
  iframe.className = 'result-video';
  iframe.src = embedUrl;
  iframe.title = 'Song video';
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  return iframe;
}
