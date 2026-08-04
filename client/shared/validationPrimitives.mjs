// @ts-check
// Pure validation predicates shared between the browser app (src/) and the
// Node build scripts (scripts/). No DOM, no import.meta.env, no filesystem —
// scripts/puzzleConventions.mjs is loaded by vite.config.js at config-load
// time, so anything reachable from here must stay safe to run in plain Node.

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
