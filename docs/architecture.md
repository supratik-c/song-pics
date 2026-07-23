# Architecture

Badly Drawn Bangers is a frontend-only daily browser game. The browser loads
dated puzzle JSON and clue images from static files, evaluates guesses locally,
and persists per-puzzle progress in production. Vite builds the only running
application and GitHub Pages serves the resulting static artifact.

Keeping the system static is deliberate. A backend becomes worthwhile only
when the server must own secrets or authority, such as hidden answers,
server-validated guesses, accounts, leaderboards, publishing administration,
or server-side analytics. The answers in the current static JSON are therefore
discoverable by a determined player.

## Runtime flow

`client/src/main.ts` checks whether the loaded JavaScript matches the latest
deployment, collects the page elements, and starts the application. `app.ts`
then loads the selected puzzle and archive, restores its state, renders the UI,
and coordinates user events. Guess rules are pure functions in `game.ts`;
content selection and validation live in loaders; DOM construction lives in
`render.ts`; and per-puzzle persistence lives in `storage.ts`.

With no `puzzle` query parameter, the loader selects the latest released
puzzle. `?puzzle=YYYY-MM-DD` selects a released archive entry. Runtime content
paths pass through `resolvePublicPath` so the same code works at `/` and beneath
a GitHub Pages repository base path.

## Build flow

`client/content/` is source content. Before development or production builds,
the puzzle metadata script derives the archive index and panel manifest from
the dated content tree. Development can serve future puzzle directories for
authoring. Production copies only released dated puzzles to `client/dist/`,
regenerates released-only metadata there, and retains shared non-dated content.
The UI's future-puzzle screen is a friendly guard; excluding the files from the
production artifact is the security boundary.

Vite also emits a build-version manifest. Production clients compare it with
the build identifier compiled into the JavaScript and perform at most one
cache-busting reload when a new deployment is detected. Runtime content URLs
carry the same build identifier; compiled assets use Vite's content hashes.

## Responsibility map

- `client/index.html` and `client/src/styles.css`: semantic shell and visual
  system.
- `client/src/app.ts`: loading, event handling, state transitions, and rendering
  coordination.
- `client/src/game.ts`, `storage.ts`, and `completion.ts`: game rules and local
  progress.
- `client/src/puzzleLoader.ts` and other loaders: external data selection and
  validation.
- `client/src/render.ts` and `modal.ts`: DOM output and reusable dialog behavior.
- `client/scripts/` and `client/vite.config.js`: generated puzzle metadata,
  release filtering, and build output.

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
