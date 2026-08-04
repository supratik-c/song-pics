// Shared helpers for test files. Not a `.test.ts` file itself, so vitest
// does not collect it as a suite.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Loads the real index.html shell's body into the test document, so tests
// exercise the actual `#id` contract between the page and dom.ts instead of
// a hand-built element literal that can drift from the markup unnoticed.
export function loadAppShellIntoDocument(): void {
  const html = readFileSync(
    resolve(import.meta.dirname, '../index.html'),
    'utf8',
  );
  const bodyMatch = /<body>([\s\S]*)<\/body>/.exec(html);

  if (!bodyMatch) {
    throw new Error('index.html is missing a <body> element');
  }

  document.body.innerHTML = bodyMatch[1];
}
