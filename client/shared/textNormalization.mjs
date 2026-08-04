// @ts-check
// Answer normalization shared between the browser app (src/) and the Node
// build scripts (scripts/), so a puzzle's accepted answers are judged by
// the exact same rule at authoring time and at play time.

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
