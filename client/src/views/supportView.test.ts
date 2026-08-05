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

  it('renders the heading and a Ko-fi link when the trigger is on', () => {
    const prompt = renderSupportPrompt({
      supportUrl,
      shouldRender: () => true,
    });

    if (!prompt) {
      throw new Error('support prompt did not render');
    }

    const text = prompt.querySelector('.support-prompt-text');
    const link = prompt.querySelector<HTMLAnchorElement>('.support-link');
    const logo = prompt.querySelector<HTMLImageElement>('.support-logo');

    expect(text?.textContent).toBe('Like Scribble Bops? Support us on');
    expect(link?.href).toBe(supportUrl);
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
    expect(link?.getAttribute('aria-label')).toBe(
      'Support Scribble Bops on Ko-fi',
    );
    expect(logo?.alt).toBe('');
    expect(link?.contains(logo)).toBe(true);
  });

  it('places the heading text before the link in document order', () => {
    const prompt = renderSupportPrompt({
      supportUrl,
      shouldRender: () => true,
    });

    const children = Array.from(prompt?.children ?? []);
    const textIndex = children.findIndex((child) =>
      child.classList.contains('support-prompt-text'));
    const linkIndex = children.findIndex((child) =>
      child.classList.contains('support-link'));

    expect(textIndex).toBeGreaterThanOrEqual(0);
    expect(linkIndex).toBeGreaterThan(textIndex);
  });
});
