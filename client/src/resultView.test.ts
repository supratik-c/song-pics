import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl } from './views/resultView.ts';

describe('YouTube URL conversion', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=A_MjCqQoLLA',
      'https://www.youtube.com/embed/A_MjCqQoLLA',
    ],
    [
      'https://youtube.com/watch?v=A-Mj_CqQo1',
      'https://www.youtube.com/embed/A-Mj_CqQo1',
    ],
    [
      'https://youtu.be/A_MjCqQoLLA?t=42',
      'https://www.youtube.com/embed/A_MjCqQoLLA',
    ],
    [
      'https://www.youtube.com/embed/A_MjCqQoLLA',
      'https://www.youtube.com/embed/A_MjCqQoLLA',
    ],
  ])('supports %s', (url, expected) => {
    expect(getYouTubeEmbedUrl(url)).toBe(expected);
  });

  it.each([
    'not a URL',
    'https://vimeo.com/A_MjCqQoLLA',
    'https://youtube.com.evil.invalid/watch?v=A_MjCqQoLLA',
    'https://www.youtube.com/watch',
    'https://youtu.be/',
    'https://youtu.be/A_MjCqQoLLA/extra',
    'ftp://youtu.be/A_MjCqQoLLA',
    'https://youtu.be/video.id',
    'https://www.youtube.com/embed/video%20id',
    'https://www.youtube.com/embed/A_MjCqQoLLA/extra',
  ])('rejects %s', (url) => {
    expect(getYouTubeEmbedUrl(url)).toBeNull();
  });
});
