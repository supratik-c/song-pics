# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

```bash
npm ci                        # clean install (matches CI)
npm test                      # vitest run — non-watch; there is no test:watch script
npm run typecheck             # tsc --noEmit
npm run build                 # generates puzzle index, then vite build -> client/dist
npm run generate:puzzle-index # regenerate content/puzzles/{index.json,panels.json}
```

Single test / filtering:

```bash
npx vitest run src/game.test.ts            # one browser-code test file
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
| `VITE_PUBLIC_SITE_URL` | base-aware localhost | Absolute URL used in generated share-page OG metadata. |

For any build, path, or date change, build twice — default base **and**
`VITE_BASE_PATH=/song-pics/` — then inspect `dist/content` (AGENTS.md verification matrix).

## Architecture

Frontend-only daily song-guessing game. Strict TypeScript + Vite + plain DOM/CSS,
**zero runtime dependencies** — only `typescript`, `vite`, `vitest` as devDeps.
`client/` is the only running application; `api/` and `infra/` are empty placeholders.

Runtime layering (do not collapse these boundaries):

```
main.ts      composition root — the only place that constructs browser adapters
  -> app.ts  orchestration + event handling; never writes DOM directly
       -> game.ts / gameConfig.ts   pure rules, immutable transitions, policy
       -> puzzleLoader / howToPlayLoader   fetch + complete boundary validation
       -> views/*   pure render functions; never fetch or persist
       -> storage.ts / completion.ts   replaceable persistence boundaries
```

Two Vite HTML entries: `index.html` -> `src/main.ts`, `legal.html` -> `src/legal.ts`.
No router — navigation is full page loads driven by `?puzzle=YYYY-MM-DD`, parsed by
pure functions in [client/src/navigation.ts](client/src/navigation.ts). No `puzzle`
query selects the latest release. State is one `let state` in the `initApp` closure,
reassigned from pure `game.ts` transitions.

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
[client/src/types.ts](client/src/types.ts). Views take the narrowest type so pre-solve
code cannot reach the answer.

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

[client/src/publicPath.ts](client/src/publicPath.ts) is the single most load-bearing
utility. Every runtime content and asset URL must go through it — it prefixes
`import.meta.env.BASE_URL` (stripping leading slashes so the base is not doubled) and
appends `?v=<VITE_BUILD_ID>` for cache busting. Absolute URLs pass through untouched.
The deliberate exception is [client/src/deploymentVersion.ts](client/src/deploymentVersion.ts),
which builds its own uncached URL so it can detect a *newer* build.

Three asset classes, three base-path mechanisms: runtime content uses
`resolvePublicPath`; bundled JS/CSS/fonts/UI icons use Vite `base` + content hashing;
static HTML links use the `%BASE_URL%` token.

All external JSON goes through `fetchStaticJson` in
[client/src/validation.ts](client/src/validation.ts), which checks `response.ok` and
applies a complete type guard before data enters the app. Use `textContent` and DOM
APIs; `innerHTML` appears nowhere in this codebase.

## Conventions

- **Imports carry explicit `.ts` extensions** (`from './game.ts'`) —
  `allowImportingTsExtensions` is on in `tsconfig.json`.
- **Tests are co-located**: `<name>.test.ts` beside browser code, `<name>.test.mjs`
  beside build scripts in `client/scripts/`. No `tests/` or `__tests__/` directory,
  no e2e suite.
- **No DOM environment in tests.** There is no vitest config, so tests run in Node.
  DOM tests hand-roll `FakeElement` / `FakeClassList` / `FakeStyle` and use
  `vi.stubGlobal` / `vi.stubEnv`. Follow that pattern rather than adding jsdom.
- **Duplicated logic is intentional.** Answer normalization and puzzle-date rules are
  implemented twice — browser TS (`src/game.ts`, `src/puzzleDates.ts`) and Node ESM
  (`scripts/puzzleValidation.mjs`, `scripts/puzzleConventions.mjs`) — kept aligned by
  shared fixtures in `client/fixtures/`. Change all three together.
- `client/.npmrc` sets `ignore-scripts=true`. Keep dependency lifecycle scripts
  disabled; prefer a reviewed one-off exception over re-enabling them globally.
- The product name is "Scribble Bops" (`scribble-bops` for identifiers). `song-pics`
  is the repository and Pages base path only — do not conflate them.

## Deployment

[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) is the active
path: on push to `main` under `client/**`, it runs `npm ci`, `npm run typecheck`,
`npm test`, `bash scripts/convert.sh`, then `npm run build` with the Pages base path,
and publishes `client/dist`.
[.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml) is a
dormant scaffold — manual dispatch only, gated on a `confirm_deploy` checkbox. GitHub
Pages remains production.
