import { describe, expect, it, vi } from 'vitest';
import { renderShareControl } from './shareView.ts';

describe('share control', () => {
  it('leaves an operable link when sharing and copying fail', async () => {
    const shareUrl = 'https://example.test/share/2026-07-23/';
    const control = renderShareControl({
      fallbackUrl: shareUrl,
      getRequest: () => ({
        title: 'Scribble Bops',
        text: 'A spoiler-free invitation',
        url: shareUrl,
      }),
      share: vi.fn().mockResolvedValue('failed'),
    });
    const button = control.querySelector<HTMLButtonElement>('.share-button');
    const status = control.querySelector<HTMLElement>('.share-status');

    if (!button || !status) {
      throw new Error('share control is missing expected elements');
    }

    button.click();

    await vi.waitFor(() => {
      expect(status.childNodes).toHaveLength(2);
    });

    const link = status.querySelector('a');

    expect(status.textContent).toBe(
      'The invite could not be shared or copied. Open the share link.',
    );
    expect(link?.textContent).toBe('Open the share link.');
    expect(link?.href).toBe(shareUrl);
    expect(button.disabled).toBe(false);
  });
});
