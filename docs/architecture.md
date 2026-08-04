# Architecture

Scribble Bops is a frontend-only daily browser game. The browser loads
dated puzzle JSON and clue images from static files, evaluates guesses locally,
and persists per-puzzle progress in production. Vite builds the only running
application and GitHub Pages serves the resulting static artifact.

Keeping the system static is deliberate. A backend becomes worthwhile only
when the server must own secrets or authority, such as hidden answers,
server-validated guesses, accounts, leaderboards, publishing administration,
or server-side analytics. The answers in the current static JSON are therefore
discoverable by a determined player.

## Runtime flow

`client/src/main.ts` is the concrete composition root. It checks whether the
loaded JavaScript matches the latest deployment, parses the requested puzzle,
collects the page elements, constructs the browser adapters, and passes an
`AppDependencies` object to `initApp`. Those dependencies provide puzzle and
How to Play loading, state persistence, archive completion, and archive URL
construction. `app.ts` coordinates those capabilities and user events without
constructing concrete infrastructure.

`client/src/` is organized by layer: `domain/` holds pure rules, transitions,
and policy with no fetch, DOM, or storage access (`game.ts`, `gameConfig.ts`,
`puzzleDates.ts`, `navigation.ts`, `performance.ts`, `types.ts`); `content/`
holds the fetch-and-validate boundary (`puzzleLoader.ts`, `howToPlayLoader.ts`,
`validation.ts`, `publicPath.ts`); `platform/` holds replaceable browser
adapters (`storage.ts`, `completion.ts`, `dom.ts`, `modal.ts`, `share.ts`,
`browserShare.ts`, `deploymentVersion.ts`, `tactileAction.ts`); `views/` holds
DOM output that never fetches or persists. `app.ts` and `main.ts` sit at
`client/src/` root, alongside `legal.ts` and `fontLicenses.ts` (which
`legal.html` needs) — none of those four can move into a layer folder, since
`index.html`/`legal.html` reference them by literal path and `tsc` cannot
check an HTML attribute.

Loaders fetch static content through a shared JSON boundary that checks
status, defaults to fresh requests, lets deployment-versioned content use
normal HTTP caching, and validates data before it enters the application.
Browser persistence adapters for puzzle progress and session-scoped YouTube
consent live in `storage.ts`; the independently replaceable completion read
model lives in `completion.ts`.

Pure functions in `navigation.ts` own puzzle-query parsing and archive URL
construction. With no `puzzle` query parameter, the latest released puzzle is
selected. `?puzzle=YYYY-MM-DD` selects a released archive entry. Runtime
content paths pass through `resolvePublicPath` so the same code works at `/`
and beneath a GitHub Pages repository base path.

Generated `/share/YYYY-MM-DD/` entry pages give link-preview crawlers static,
puzzle-specific metadata whose image points at the released puzzle's existing
first panel. The browser recognizes that base-aware path, selects its puzzle,
and normalizes the address to the canonical puzzle query before composing
navigation URLs. Terminal share controls copy the invitation on desktop and
use link-only OS sharing on conservatively recognized mobile platforms when
available. Both paths use the same stable share-page URL; no clue file is
attached to the browser share payload. The request is derived synchronously
when the control is activated, so its playful performance line reflects the
latest in-memory terminal state without delaying the native share call.

## Build flow

`client/content/` is source content. Before development or production builds,
the puzzle metadata scripts validate dated puzzle directories and derive the
archive index and panel manifest. Development can serve future puzzle
directories for authoring. A dedicated, testable release-copy module copies
only released puzzles to `client/dist/`, regenerates released-only metadata,
and retains shared non-dated content. The UI's future-puzzle screen is a
friendly guard; excluding the files from the production artifact is the
security boundary.

The same captured release date drives generation of one small share HTML page
per released puzzle. Those pages reuse the bundled application shell and
reference existing puzzle panels rather than copying images beneath `share/`.

Answer normalization, puzzle date-id parsing/calendar math, and YouTube
video-id extraction are each implemented once in `client/shared/*.mjs` and
imported by both the browser TypeScript in `client/src/` and the Node build
scripts in `client/scripts/`, so the two runtimes cannot drift. `vite.config.js`
loads one of these modules at config time, so shared modules stay plain-Node
safe: no `import.meta.env`, no DOM. `client/tsconfig.json` sets `allowJs`
(not `checkJs`), so these type-check via `// @ts-check` + JSDoc without
pulling the rest of `scripts/` into the TypeScript program.

Vite also emits a build-version manifest. Production clients compare it with
the build identifier compiled into the JavaScript and perform at most one
cache-busting reload when a new deployment is detected. Runtime content URLs
carry the same build identifier; compiled assets use Vite's content hashes.

## Responsibility map

- `client/index.html` and `client/src/platform/dom.ts`: static semantic shell
  and typed element references. `dom.test.ts` checks the two stay in sync.
- `client/src/main.ts`: deployment check and concrete dependency composition.
- `client/src/app.ts`: application orchestration and browser event handling.
- `client/src/domain/game.ts` and `gameConfig.ts`: pure game rules, immutable
  transitions, and gameplay policy.
- `client/src/domain/puzzleDates.ts`: pure puzzle date-id parsing, calendar
  math, and display-date formatting, built on `client/shared/puzzleDateMath.mjs`.
- `client/src/domain/performance.ts`: a pure terminal-performance read model
  derived from the current game state; its browser values are not authoritative
  for competitive leaderboards.
- `client/src/domain/navigation.ts`: pure query parsing and archive URL
  behavior.
- `client/src/platform/share.ts`, `browserShare.ts`, and `views/shareView.ts`:
  pure share requests, browser sharing/copy fallbacks, and reusable share
  controls.
- `client/src/domain/types.ts` and `content/validation.ts`: domain/content
  contracts and reusable runtime validation primitives.
- `client/src/content/`: static content selection, fetching, and complete
  boundary validation (`puzzleLoader.ts`, `howToPlayLoader.ts`, `publicPath.ts`).
- `client/src/platform/storage.ts` and `completion.ts`: replaceable progress,
  session-consent, and completion-read-model boundaries with browser-local
  implementations.
- `client/src/platform/deploymentVersion.ts`: compares the running build
  against `build-version.json` and performs at most one cache-busting reload.
- `client/src/platform/tactileAction.ts`: defers a button's action until its
  press animation ends (or a fallback timer, or immediately under reduced
  motion), shared by every tactile control.
- `client/src/views/`, `platform/modal.ts`, and `styles/`: focused DOM output,
  dialog lifecycle, and the visual system.
- `client/src/legal.ts` and `fontLicenses.ts`: the legal page's font-license
  listing; kept at `client/src/` root alongside `main.ts` because `legal.html`
  references `legal.ts` by literal path.
- `client/shared/*.mjs`: pure logic shared between the browser app and the
  Node build scripts — answer normalization, puzzle date math, and YouTube
  video-id extraction (see Build flow above).
- `client/scripts/` and `client/vite.config.js`: authoring validation, generated
  metadata and share pages, release filtering/copying, and build integration.

## Documentation map

Read this overview for every task, then read every detailed document whose
concern the task touches:

| Concern | Detailed document |
| --- | --- |
| Guess rules, states, results, persistence, issue numbering, or completion | [Gameplay](gameplay.md) |
| HTML, rendering, dialogs, accessibility, responsive layout, or visual behavior | [Frontend](frontend.md) |
| Puzzle authoring, assets, manifests, runtime paths, builds, caching, or deployment | [Content delivery](content-delivery.md) |
| Commercialisation, intellectual property, tips, privacy, or third-party services | [Commercialisation](commercial.md) |

Keep exact style values and short-lived implementation detail in source code.
Use a small decision record only when a future architectural choice has
meaningful alternatives and rationale that the living documents should not
have to retell.
