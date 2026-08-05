import kofiLogoUrl from '../assets/ui/branding/kofi-logo.webp';

export type SupportPromptOptions = {
  supportUrl: string;
  shouldRender: () => boolean;
};

/**
 * Renders the Ko-fi support prompt: an introductory line and a linked logo
 * below it, or nothing at all when `shouldRender` returns false. The two
 * pieces are built as one detached section so callers can mount and move
 * them together without splitting the text from the button.
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
  text.textContent = 'Like Scribble Bops? Support us on';

  link.className = 'support-link tactile-button';
  link.href = options.supportUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Support Scribble Bops on Ko-fi');

  logo.className = 'support-logo';
  logo.src = kofiLogoUrl;
  logo.width = 600;
  logo.height = 164;
  logo.alt = '';

  disclaimer.className = 'support-disclaimer';
  disclaimer.textContent =
    "Tips are optional and don't unlock anything in the game.";

  link.append(logo);
  prompt.append(text, link, disclaimer);

  return prompt;
}
