// @ts-check
// Share-surface copy shared between the browser app (src/platform/share.ts)
// and the Node build script that generates dist/share/<id>/index.html
// (scripts/sharePages.mjs), so the product name and invitation cannot drift
// between the card a crawler renders and the message a player pastes.
// No DOM, no import.meta.env — vite.config.js loads sharePages.mjs at
// config-load time in plain Node.
//
// Scope is deliberately narrow: copy with two runtimes. Single-consumer
// prose (index.html's title and masthead, the Ko-fi support line, the legal
// page) stays where it is rendered.

export const PRODUCT_NAME = 'Scribble Bops';

// Spoiler-free. Rendered as og:description / twitter:description on
// generated share pages, and as the first line of the browser share text.
export const SHARE_INVITATION =
  "Can you guess today's song from some questionable hand-drawn doodles?";
