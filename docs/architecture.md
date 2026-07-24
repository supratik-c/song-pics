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

Game rules and immutable state transitions live in `game.ts`, with durable
policy in `gameConfig.ts`. Loaders fetch static content through a shared JSON
boundary that checks status, disables caching, and validates data before it
enters the application. Focused modules under `views/` own DOM output. Browser
persistence is an adapter in `storage.ts`; the independently replaceable
completion read model lives in `completion.ts`.

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
attached to the browser share payload.

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

Shared JSON fixtures exercise normalization and date behavior in both browser
TypeScript and build scripts. This keeps independently implemented boundaries
aligned and gives a future backend portable cases for the same behavior without
creating a shared runtime package prematurely.

Vite also emits a build-version manifest. Production clients compare it with
the build identifier compiled into the JavaScript and perform at most one
cache-busting reload when a new deployment is detected. Runtime content URLs
carry the same build identifier; compiled assets use Vite's content hashes.

## Responsibility map

- `client/index.html` and `client/src/dom.ts`: static semantic shell and typed
  element references.
- `client/src/main.ts`: deployment check and concrete dependency composition.
- `client/src/app.ts`: application orchestration and browser event handling.
- `client/src/game.ts` and `gameConfig.ts`: pure game rules, immutable
  transitions, and gameplay policy.
- `client/src/navigation.ts`: pure query parsing and archive URL behavior.
- `client/src/share.ts`, `browserShare.ts`, and `views/shareView.ts`: pure share
  requests, browser sharing/copy fallbacks, and reusable share controls.
- `client/src/types.ts` and `validation.ts`: domain/content contracts and
  reusable runtime validation primitives.
- Loaders: static content selection, fetching, and complete boundary validation.
- `client/src/storage.ts` and `completion.ts`: replaceable state-store and
  completion-read-model boundaries with local implementations.
- `client/src/views/`, `modal.ts`, and `styles/`: focused DOM output, dialog
  lifecycle, and the visual system.
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

Keep exact style values and short-lived implementation detail in source code.
Use a small decision record only when a future architectural choice has
meaningful alternatives and rationale that the living documents should not
have to retell.
