import type { ModalTone } from '../modal.ts';
import type { GameStatus, PuzzleSolution } from '../types.ts';

export type RenderedResult = {
  title: string;
  content: DocumentFragment;
  onClose?: () => void;
  tone: ModalTone;
};

export function renderResultContent(
  solution: PuzzleSolution,
  status: Exclude<GameStatus, 'playing'>,
): RenderedResult {
  const content = document.createDocumentFragment();
  const message = document.createElement('p');
  const answer = document.createElement('p');
  let title: string;
  const tone = status === 'solved' ? 'success' : 'default';

  message.className = 'result-message';
  answer.className = 'result-answer';
  answer.textContent = `${solution.songTitle} by ${solution.artist}`;

  if (status === 'solved') {
    title = 'Correct!';
    message.textContent = 'You decoded the doodles.';
  } else if (status === 'revealed') {
    title = 'Song Revealed';
    message.textContent =
      'The scribbles win this round. The song was:';
  } else {
    title = 'Out of Guesses';
    message.textContent = 'That was your last guess. The song was:';
  }

  content.append(message, answer);

  if (status !== 'failed' && solution.youtubeURL) {
    const video = createYouTubeVideo(solution.youtubeURL);

    if (video) {
      content.append(video);
      return {
        title,
        content,
        tone,
        onClose: () => {
          video.src = 'about:blank';
        },
      };
    }
  }

  return { title, content, tone };
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
