---
name: run-scribble-bops
description: Build, run, and drive Scribble Bops (the song-pics client) — start it, take a screenshot, click through a guess/reveal/archive flow, or run its test suite. Use when asked to run, start, build, test, or screenshot the game, or to visually verify a UI/gameplay change actually works.
---

Scribble Bops is a frontend-only static game (Vite + TS, `client/` is the only
running app). It is driven headlessly with Playwright via
`.claude/skills/run-scribble-bops/driver.mjs`, which builds the app, serves
the **built** `dist/` with `vite preview`, and scripts a Chromium session
against it — screenshots land in `.claude/skills/run-scribble-bops/shots/`.

All paths below are relative to `client/` unless stated otherwise.

## Important: this skill is a deliberate, scoped exception

`AGENTS.md` and `CLAUDE.md` tell agents never to run a dev/preview server —
routine code edits must build and inspect `client/dist/` files directly, to
keep verification deterministic. **That rule still applies to normal work.**
This skill exists specifically to give an agent a way to *visually* verify a
UI/gameplay change by actually seeing it render — the driver runs
`vite preview` (serves the already-built, release-filtered `dist/` output; it
is not the hot-reloading `vite dev` dev server) only for the duration of the
`smoke`/`serve` commands below, and stops it afterward. Outside this skill,
keep following AGENTS.md: build, then inspect `dist/` files directly.

## Prerequisites

Node 22.12+. `npm run build` needs the `dwebp` binary on `PATH` (from the
`webp` system package) — already present in this container; if missing:
`sudo apt-get install -y webp`.

Headless Chromium needs `libnspr4`, `libnss3`, and `libasound2` at the OS
level, on top of the Chromium binary itself. Both are now installed in this
container (`libnspr4`/`libnss3`/`libasound2t64` via apt, and Chromium/
Firefox/WebKit already downloaded to `~/.cache/ms-playwright/` via
`npx playwright install --with-deps`), so `driver.mjs setup` (below) is
normally a fast no-op after its first run. It still knows how to fix a
genuinely fresh container that lacks both — see Gotchas.

## Setup (one time, or after a Playwright/Chromium bump)

```bash
cd client/.claude/skills/run-scribble-bops
node driver.mjs setup
```

This `npm install`s `playwright-core` **inside the skill directory** (its
own `package.json` — deliberately not added to `client/package.json`, which
CLAUDE.md keeps at zero runtime dependencies), downloads the Chromium binary
via `npx playwright-core install chromium`, then checks
`install-deps --dry-run`: if the OS libs are already present (the normal
case in this container) it stops there; otherwise it tries
`install --with-deps` (needs sudo) and, only if that also fails, falls back
to vendoring the three libs locally without root — see Gotchas. Idempotent
— safe to re-run.

## Build

```bash
cd client
npm ci
npm run build   # -> client/dist/
```

## Run (agent path)

```bash
cd client/.claude/skills/run-scribble-bops
node driver.mjs smoke
```

This builds the app, starts `vite preview` on port 4174, then in one
Chromium session: loads today's puzzle, submits a wrong guess, opens the
"How to Play" modal, opens "All Releases", checks the 375px mobile layout,
and clicks "Reveal Song" to reach the solved state — screenshotting each
step to `shots/01-initial.png` .. `shots/06-revealed.png`, and stops the
server when done. It also prints any browser console errors it saw
(`[console errors] ...` vs `[console] no errors`) — check that output before
trusting a screenshot.

For anything beyond the six built-in steps, drive it yourself:

```bash
node driver.mjs serve                              # starts vite preview, waits until it responds
node driver.mjs shot '/?puzzle=2026-07-01'          # nav + screenshot -> shots/shot.png
node driver.mjs shot '/' '#guess-input'             # nav, wait for selector, then screenshot
node driver.mjs stop                                # frees port 4174
```

`shot` and `serve`/`stop` assume a server is already up (`serve` starts one;
`smoke` manages its own). For custom interactions beyond a screenshot,
`import { chromium } from './node_modules/playwright-core/index.mjs'` in a
throwaway script the same way `driver.mjs` does — see `withPage()` in
`driver.mjs` for the launch args (`args: ['--no-sandbox']`); it also passes
an `env` from `libraryPathEnv()`, which is a no-op unless `setup` had to
fall back to vendoring libs (see Gotchas).

## Run (human path)

`npm run dev` (hot-reloading dev server) or `npm run preview` (serves
`dist/`), both from `client/`. Useless headless — for a human with a browser
only. Do not use these for agent verification; use the driver above.

## Test

```bash
cd client
npm test         # vitest run — 31 files / 360 tests currently pass
npm run typecheck
```

---

## Gotchas

- **Tactile button-press delay.** Buttons like `#how-to-play-button` and
  `#all-releases-button` run a CSS press animation
  (`runAfterTactileActivation` in `src/platform/tactileAction.ts`) before
  their click handler actually fires. `click()` immediately followed by
  `screenshot()` can catch the dialog still closed. Wait for the resulting
  content instead — e.g. `page.waitForSelector('#game-dialog-title', ...)`
  — not a fixed sleep.
- **A genuinely fresh container may have no passwordless sudo**, in which
  case `playwright install --with-deps` fails fast (`sudo: interactive
  authentication is required` — it does not hang) rather than succeeding.
  `driver.mjs setup` detects this via `install-deps --dry-run` first and
  falls back to `apt-get download <pkg>` (no root required, only fetches
  the `.deb`) + `dpkg-deb -x` into a local `vendor-libs/` dir + a scoped
  `LD_LIBRARY_PATH` for the Playwright launch only — nothing touches the
  system. This is what made the skill work in this container before it had
  real sudo access; keep the fallback even though the fast path covers the
  common case now.
- **Default `chromium.launch()` (no explicit `executablePath`) works fine**
  as long as the OS libs are present (system-installed or vendored) — no
  need to point at the separate `chromium-headless-shell` binary.
- **`npm run preview` backgrounded via `npm run preview &` cannot be killed
  by its own PID** — `$!` is the `npm` wrapper, which doesn't forward
  signals to the `vite preview` child it spawns. Kill the port's listener
  instead: `lsof -ti:4174 -sTCP:LISTEN | xargs -r kill` (this is what
  `driver.mjs stop` does).
- **Testing the solved state without spoiling today's answer**: click
  `#reveal-song-button` rather than guessing — it reaches the same
  post-solve UI (`#share-region`) without needing to know or hardcode the
  actual song, which AGENTS.md asks to keep out of logs/copy.

## Troubleshooting

- **`error while loading shared libraries: libnspr4.so: cannot open shared
  object file`**: OS libs missing and not vendored yet. Run
  `node driver.mjs setup` — it installs them the normal way if it can, or
  vendors them without root if not.
- **`sudo: interactive authentication is required`**: `install --with-deps`
  couldn't get sudo. `driver.mjs setup` already treats this as expected and
  falls back automatically — no action needed unless you're running the
  bare `npx playwright install --with-deps` yourself outside the driver.
- **`node driver.mjs serve` (or any command that intentionally leaves the
  preview server running) appears to hang forever**: the spawned `vite
  preview` child wasn't `unref()`'d, so Node's event loop never drains.
  `driver.mjs` already calls `proc.unref()` in `startPreview()` — if you
  copy this pattern into a throwaway script, don't drop that call.
- **`EADDRINUSE` on port 4174**: a previous server wasn't stopped. Run
  `node driver.mjs stop`, or directly:
  `lsof -ti:4174 -sTCP:LISTEN | xargs -r kill`.
