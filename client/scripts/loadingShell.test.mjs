import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8',
);
const gameCss = readFileSync(
  new URL('../src/styles/game.css', import.meta.url),
  'utf8',
);

describe('static loading shell', () => {
  it('uses the runtime loading indicator reveal delay', () => {
    const indicator = indexHtml.match(
      /<p\s+class="loading-indicator loading-indicator-large"[\s\S]*?<\/p>/,
    )?.[0];

    expect(indicator).toContain(
      '--loading-indicator-reveal-delay: 250ms',
    );
  });

  it('reserves one line for puzzle metadata before it loads', () => {
    expect(gameCss).toMatch(
      /\.game-header > \.eyebrow,\s*\.game-header > h2\s*{\s*min-block-size: 1lh;\s*}/,
    );
  });

  it('reserves the interaction and typical panel layout while loading', () => {
    const form = indexHtml.match(
      /<form[\s\S]*?id="guess-form"[\s\S]*?<\/form>/,
    )?.[0];
    const openingTag = form?.match(/^<form[\s\S]*?>/)?.[0];
    const loadingPanels = gameCss.match(
      /\.panels\.is-loading\s*{[\s\S]*?}/,
    )?.[0];

    expect(indexHtml).toContain('class="interaction-region"');
    expect(indexHtml).toMatch(
      /class="result-region"[\s\S]*?hidden[\s\S]*?<\/section>/,
    );
    expect(openingTag).toContain('inert');
    expect(openingTag).toContain('aria-hidden="true"');
    expect(openingTag).not.toContain(' hidden');
    expect(form?.match(/\sdisabled/g)).toHaveLength(4);
    expect(form).toContain('>Guesses left</p>');
    expect(loadingPanels).toContain('aspect-ratio: 4 / 3');
  });
});
