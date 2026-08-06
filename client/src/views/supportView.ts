import kofiLogoUrl from '../assets/ui/branding/kofi-logo.webp';

export type SupportPromptOptions = {
  supportUrl: string;
  shouldRender: () => boolean;
};

/**
 * Renders the Ko-fi support prompt, or nothing at all when `shouldRender`
 * returns false. The linked logo sits inline at the end of the "Buy us a"
 * sentence -- a Ko-fi pun on "buy us a coffee" -- with a disclaimer below.
 * Built as one detached section so callers can mount and move it as a unit.
 */
export function renderSupportPrompt(
  options: SupportPromptOptions,
): HTMLElement | null {
  if (!options.shouldRender()) {
    return null;
  }

  const prompt = document.createElement('section');
  const text = document.createElement('p');
  const link = document.createElement('a');
  const logo = document.createElement('img');
  const disclaimer = document.createElement('p');

  prompt.className = 'support-prompt';
  text.className = 'support-prompt-text';
  text.append('Like Scribble Bops? Buy us a ');

  link.className = 'support-link tactile-button';
  link.href = options.supportUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Buy Scribble Bops a coffee on Ko-fi');

  logo.className = 'support-logo';
  logo.src = kofiLogoUrl;
  logo.width = 600;
  logo.height = 164;
  logo.alt = '';

  disclaimer.className = 'support-disclaimer';
  disclaimer.textContent =
    "Coffees are entirely optional and don't unlock anything!";

  link.append(logo);
  text.append(link);
  prompt.append(text, disclaimer);

  return prompt;
}
