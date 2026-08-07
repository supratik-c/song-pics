# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

When you are making changes, if you find unexpected changes in files relative to your changes, do not revert them. Assume that a separate agent is working on the same branch and has made those changes. Assess them for any conflicts with your work, and leave as is if none are found. If there is a conflict with your work, then work through the dependecies and resolve it without reverting that change.

## Read first

- [AGENTS.md](AGENTS.md) is the binding contract for work in this repo: repository
  boundaries, durable behavior that must not change incidentally, puzzle-content and
  visual rules, the verification matrix, and change discipline. Follow it.
- [docs/architecture.md](docs/architecture.md) is required reading before any task.
  Use its documentation map to read the detailed doc for the concern you touch
  ([gameplay](docs/gameplay.md), [frontend](docs/frontend.md),
  [content-delivery](docs/content-delivery.md), [commercial](docs/commercial.md)).
  Update the matching doc when durable behavior or a boundary changes.

This file covers only what those documents do not: commands, environment, and
repo-specific conventions.

## Commands

There is no root `package.json`. **Every command runs from `client/`.** Node 22.12+.
`npm run build` also requires the `dwebp` binary (the `webp` system package) on
`PATH` — it decodes each puzzle's first panel to a crawler-compatible share
preview image. All CI workflows already install it; see
[docs/content-delivery.md](docs/content-delivery.md).

```bash
npm ci                        # clean install (matches CI)
npm test                      # vitest run — non-watch; there is no test:watch script
npm run typecheck             # tsc --noEmit
npm run build                 # generates puzzle index, then vite build -> client/dist
npm run generate:puzzle-index # regenerate content/puzzles/{index.json,panels.json}
```

Single test / filtering:

```bash
npx vitest run src/domain/game.test.ts     # one browser-code test file
npx vitest run scripts/sharePages.test.mjs # one build-script test file
npx vitest run -t "substring of test name" # filter by test name
npx vitest                                 # watch mode
```

`npm run dev` and `npm run preview` exist for humans. **Do not run the dev server**
(AGENTS.md) — build and inspect the files in `client/dist/` directly.

Build-time environment variables (all read in [client/vite.config.js](client/vite.config.js)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_BASE_PATH` | `/` | Vite `base`. GitHub Pages CI sets `/song-pics/`. |
| `VITE_BUILD_ID` | `local` | Compiled in, emitted to `build-version.json`, appended as `?v=` to runtime content URLs. |
| `VITE_PUBLIC_SITE_URL` | base-aware localhost | Absolute URL used in generated share-page OG metadata. Its path must match `VITE_BASE_PATH`; the build asserts this and fails otherwise. |
| `VITE_DEV_RUN_ID` | generated per config load (`Date.now()`), not settable | Dev-only; namespaces `sessionStorage` game progress per dev-server start so a restart starts clean. Read only behind `import.meta.env.DEV` in `main.ts` and eliminated from production builds. |

For any build, path, or date change, build twice — default base **and**
`VITE_BASE_PATH=/song-pics/` — then inspect `dist/content` (AGENTS.md verification matrix).

## Architecture

Frontend-only daily song-guessing game. Strict TypeScript + Vite + plain DOM/CSS,
**zero runtime dependencies** — only `typescript`, `vite`, `vitest` as devDeps.
`client/` is the only running application; `api/` and `infra/` are empty placeholders.

Runtime layering (do not collapse these boundaries):

```
main.ts       composition root — the only place that constructs browser adapters
  -> app.ts   orchestration + event handling; never writes DOM directly
       -> domain/    pure rules, transitions, policy (game.ts, gameConfig.ts,
                      types.ts, puzzleDates.ts, navigation.ts, performance.ts)
       -> content/   fetch + complete boundary validation (puzzleLoader.ts,
                      howToPlayLoader.ts, validation.ts, publicPath.ts)
       -> platform/  replaceable browser-adapter boundaries (storage.ts,
                      completion.ts, dom.ts, modal.ts, share.ts,
                      browserShare.ts, deploymentVersion.ts, tactileAction.ts)
       -> views/     pure render functions; never fetch or persist
```

`client/src/` is otherwise flat: `app.ts`, `main.ts`, `legal.ts`, `fontLicenses.ts`,
`testSupport.ts`, `styles.css`, `legal.css`, `styles/`, `assets/`. `main.ts`/`legal.ts`/
the two stylesheets/`assets/` cannot move into a layer folder — `index.html` and
`legal.html` reference them by literal path and `tsc` cannot check an HTML attribute.

Three Vite HTML entries: `index.html` -> `src/main.ts`, `legal.html` ->
`src/legal.ts`, and a static `404.html` (no script) served for unmatched paths.
No router — navigation is full page loads driven by `?puzzle=YYYY-MM-DD`, parsed by
pure functions in [client/src/domain/navigation.ts](client/src/domain/navigation.ts).
No `puzzle` query selects the latest release. State is one `let state` in the
`initApp` closure, reassigned from pure `game.ts` transitions.

### Content pipeline

Source content in `client/content/` is **copied, not bundled**. A puzzle is a
directory whose name is both its ID and its release date:
`client/content/puzzles/YYYY-MM-DD/` containing `puzzle.json` plus numerically named
panels (`1.webp`, `2.webp`, …; the integer sets display order, gaps are legal).

`puzzle.json` allows exactly seven fields — `songTitle`, `artist`, `songClue`,
`youtubeURL`, `acceptedAnswers`, `lyricLines`, `doodledBy`. Unknown fields are a hard
error at build ([client/scripts/puzzleValidation.mjs](client/scripts/puzzleValidation.mjs))
and at runtime. `id`, `displayDate`, `issueNumber`, and `panels` are **derived, never
authored** — see the `PuzzleClue` / `PuzzleSolution` / `PuzzleJson` split in
[client/src/domain/types.ts](client/src/domain/types.ts). Views take the narrowest
type so pre-solve code cannot reach the answer.

`content/puzzles/index.json` and `panels.json` are generated and gitignored — never
hand-edit them. `client/dist/` and `node_modules/` are likewise never committed.

Release filtering is a **build-time** boundary, not a UI one: `copyReleasedContent`
in [client/scripts/releaseContent.mjs](client/scripts/releaseContent.mjs) omits
future-dated puzzle directories from `dist/`, using a single date captured per build.
Dev serves future puzzles for authoring; the "Still in development" screen is only a
friendly guard.

To add a puzzle: create the dated directory, write `puzzle.json`, run
`bash scripts/convert.sh` (normalizes panels to 800x600 WebP; refuses to overwrite),
then `npm run generate:puzzle-index` and `npm test`.
[ade.md](ade.md) is the artist-facing version of this workflow.

### resolvePublicPath

[client/src/content/publicPath.ts](client/src/content/publicPath.ts) is the single
most load-bearing utility. Every runtime content and asset URL must go through it —
it prefixes `import.meta.env.BASE_URL` (stripping leading slashes so the base is not
doubled) and appends `?v=<VITE_BUILD_ID>` for cache busting. Absolute URLs pass
through untouched. The deliberate exception is
[client/src/platform/deploymentVersion.ts](client/src/platform/deploymentVersion.ts),
which builds its own uncached URL so it can detect a *newer* build.

Four asset classes, four mechanisms: runtime content uses `resolvePublicPath`;
bundled JS/CSS/fonts/UI icons use Vite `base` + content hashing; static HTML
links use the `%BASE_URL%` token; `client/public/_headers` (copied verbatim by
Vite's default `publicDir`) sets Cloudflare Workers Static Assets cache
headers and is inert on GitHub Pages.

All external JSON goes through `fetchStaticJson` in
[client/src/content/validation.ts](client/src/content/validation.ts), which checks
`response.ok` and applies a complete type guard before data enters the app. Use
`textContent` and DOM APIs; `innerHTML` appears nowhere in this codebase.

## Conventions

- **Imports carry explicit `.ts` extensions** (`from './game.ts'`) —
  `allowImportingTsExtensions` is on in `tsconfig.json`.
- **Tests are co-located**: `<name>.test.ts` beside browser code, `<name>.test.mjs`
  beside build scripts in `client/scripts/`. No `tests/` or `__tests__/` directory,
  no e2e suite.
- **Browser tests run against a real DOM.** [client/vitest.config.ts](client/vitest.config.ts)
  splits the suite into two projects: `src/**/*.test.ts` runs in `happy-dom`,
  `scripts/**/*.test.mjs` runs in `node` (build scripts only touch the filesystem).
  Prefer real DOM APIs (`document.createElement`, `vi.stubGlobal('navigator', …)` for
  platform signals) over hand-rolled fakes.
- **Shared pure logic and copy live in `client/shared/*.mjs`.** Answer normalization,
  puzzle date-id parsing and calendar math, YouTube video-id extraction, and the
  product name and share invitation (`branding.mjs`) are each implemented once there
  and imported by both the browser TS in `client/src/` and the Node ESM build scripts
  in `client/scripts/`, so the two runtimes cannot drift.
  `client/tsconfig.json` sets `allowJs` (not `checkJs`) so these type-check via
  `// @ts-check` + JSDoc without pulling the rest of `scripts/` into the TS program;
  keep new shared modules free of `import.meta.env` and DOM APIs, since
  `vite.config.js` loads `puzzleConventions.mjs` at config time in plain Node.
- `client/.npmrc` sets `ignore-scripts=true`. Keep dependency lifecycle scripts
  disabled; prefer a reviewed one-off exception over re-enabling them globally.
- The product name is "Scribble Bops" (`scribble-bops` for identifiers). `song-pics`
  is the repository and Pages base path only — do not conflate them.

## Deployment

`https://scribblebops.com` is production.
[.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml)
deploys it: on push to `main` under `client/**` (or manual dispatch), it runs
`npm ci`, `npm run typecheck`, `npm test`, `bash scripts/convert.sh`, builds
with `/` as the Vite base and `VITE_PUBLIC_SITE_URL=https://scribblebops.com/`,
and deploys `client/dist` to Cloudflare Workers Static Assets via
`wrangler deploy`. Cache headers live in `client/public/_headers`; the custom
domain route is in `client/wrangler.jsonc`.

`https://dev.scribblebops.com` is a private, Cloudflare-Access-gated preview.
[.github/workflows/deploy-cloudflare-dev.yml](.github/workflows/deploy-cloudflare-dev.yml)
deploys it on every same-repo pull request under `client/**`, via
`wrangler deploy --env dev` against the `dev` environment in
`client/wrangler.jsonc` (separate Worker, `workers_dev` and `preview_urls`
both off). See [docs/cloudflare-migration.md](docs/cloudflare-migration.md)
for the full Cloudflare setup, including the Access application.

[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) keeps
building the same source to GitHub Pages in parallel as a warm standby. Its
`VITE_PUBLIC_SITE_URL` points at its own Pages origin, not at
`scribblebops.com` — a build's OG/canonical metadata must describe the origin
it is actually served from (`assertPublicSiteUrlMatchesBasePath` in
`scripts/sharePages.mjs` enforces this at build time), and `deploy-cloudflare.yml`'s
`push` trigger is currently disabled pending Cloudflare account setup, so
GitHub Pages is the live site today.
