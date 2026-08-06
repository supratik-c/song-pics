import { describe, expect, it } from 'vitest';
import { renderSupportPrompt } from './supportView.ts';

const supportUrl = 'https://ko-fi.com/scribblebops';

describe('support prompt', () => {
  it('renders nothing, including the heading text, when the trigger is off', () => {
    const prompt = renderSupportPrompt({
      supportUrl,
      shouldRender: () => false,
    });

    expect(prompt).toBeNull();
  });

  it('renders the sentence with a Ko-fi link flowing inline at the end', () => {
    const prompt = renderSupportPrompt({
      supportUrl,
      shouldRender: () => true,
    });

    if (!prompt) {
      throw new Error('support prompt did not render');
    }

    const text = prompt.querySelector('.support-prompt-text');
    const link = text?.querySelector<HTMLAnchorElement>('.support-link');
    const logo = link?.querySelector<HTMLImageElement>('.support-logo');

    expect(text?.textContent).toBe('Like Scribble Bops? Buy us a ');
    expect(link?.href).toBe(supportUrl);
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
    expect(link?.getAttribute('aria-label')).toBe(
      'Buy Scribble Bops a coffee on Ko-fi',
    );
    expect(logo?.alt).toBe('');
  });

  it('places the disclaimer after the sentence in document order', () => {
    const prompt = renderSupportPrompt({
      supportUrl,
      shouldRender: () => true,
    });

    const children = Array.from(prompt?.children ?? []);
    const textIndex = children.findIndex((child) =>
      child.classList.contains('support-prompt-text'));
    const disclaimerIndex = children.findIndex((child) =>
      child.classList.contains('support-disclaimer'));

    expect(textIndex).toBeGreaterThanOrEqual(0);
    expect(disclaimerIndex).toBeGreaterThan(textIndex);
  });
});
