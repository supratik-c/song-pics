# Architecture

Badly Drawn Bangers is a local-first browser game. The current architecture is intentionally small: the frontend loads puzzle data and panel images from local files, checks guesses in the browser, and stores daily progress in `localStorage` for production builds.

## Directory Structure

```text
client/           Browser game frontend
api/              Future backend boundary
infra/            Future AWS infrastructure definitions
docs/             Project documentation
```

The repo keeps `client/` and `api/` at the root instead of nesting them under `apps/`. That is enough structure for one frontend and one future backend without adding an extra directory level.

## Frontend

`client/` contains the playable website and owns the TypeScript toolchain. The browser entrypoint is `client/src/main.ts`. Vite runs from `client/` and uses `client/index.html` as the app entrypoint. During development, run:

```bash
cd client
npm run dev
```

The current app loads today's puzzle from:

```text
/content/puzzles/2026-07-05/puzzle.json
```

Panel image paths also live under `/content`, for example:

```text
/content/puzzles/2026-07-05/1.webp
```

## Content

`client/content/` is the source of truth for daily puzzles and storyboard images while the game is frontend-only. If content later needs publishing tools or backend access, it can move back to a root-level content boundary.

Puzzle panel rasters use an 800 × 600 pixel (4:3) canvas to limit the static
download size and match the clue grid. `client/scripts/convert.sh` resizes PNG
source artwork to those exact dimensions while converting it to WebP before it
is added to a dated puzzle directory.

Reusable How to Play content lives in `client/content/how-to-play/`. Its
validated `manifest.json` defines the introduction, instruction sections, and
example clue, panels, answer, and artist. Tutorial panel paths are file names
relative to that directory and pass through the deployment base-path helper.

## UI Assets

Interface artwork belongs in `client/src/assets/ui/`, separate from daily
puzzle content. Locally hosted fonts and their licenses live in `fonts/`.
Future reusable logo art, decorative drawings, and raster surfaces should use
`branding/`, `doodles/`, and `textures/` respectively when those assets are
introduced.

Prefer SVG for scalable line art and compressed WebP for raster artwork.
Reference UI assets with relative CSS URLs or TypeScript imports so Vite
fingerprints them and rewrites their paths for the configured deployment base.
Keep puzzle panels and other runtime-loaded content under `client/content/`,
where the existing release-filtering and copy behavior applies.

## UI Composition

The browser shell is a single responsive comic-page frame. `client/index.html`
owns its semantic structure: the title panel, the How to Play and Previous
Issues controls, the reusable dialog shell, the clue heading, the guess form,
the four-cell action grid, and the feedback regions. `client/src/styles.css` turns those native controls
and regions into straight clue panels and selectively diagonal action panels
without replacing their keyboard-operable hit areas. The guess entry and action
grid form one continuous control panel with a shared paper background and no
divider between them. The guess prompt and action-grid labels use an enlarged
responsive type scale so those prompts remain visually prominent. The Guess
label is approximately 47 percent larger than the other action-grid labels at
both desktop and mobile sizes. The remaining action-grid labels and the revealed
artist value share the same scale. Revealed artist text can wrap at any character
when necessary, and its auto-sized grid row grows to keep long names inside the cell.
Interactive comic buttons share a reusable `tactile-button` press treatment:
hover lifts the control and deepens its hard shadow, while press movement
compresses that shadow against the control. Individual button styles supply
only their resting shadow depth, including the shallower mobile action shadow.
The How to Play and Previous Issues controls share the
`--header-control-font-max` visual token, keeping their maximum text size aligned
and adjustable in one place.
Validation feedback appears as a peach, four-sided bordered box inset within the
form rather than as a full-width divider between the guess entry and actions.
Previous guesses render as unnumbered, wrapping boxes separated by the shared
layout gap.

`client/src/modal.ts` controls one native `<dialog>` instance. It owns the
common title, close behavior, cleanup, and focus restoration, while
feature-specific functions in `client/src/render.ts` provide typed
`DocumentFragment` content. This keeps the popup reusable without introducing
a JSON-defined general UI system or branching inside the dialog controller.
The optional success tone gives correct-result dialogs a centered green banner
without changing other popup headers. Closing a dialog removes its content,
which also stops an embedded video.

How to Play loads and validates its manifest lazily. Previous Issues renders
released puzzle IDs newest-first in pages of five and opens on the page
containing the selected puzzle. Archive links preserve the URL contract: the
latest puzzle has no `puzzle` query parameter and older puzzles use
`?puzzle=YYYY-MM-DD`.

## Frontend Game Rules

`client/src/game.ts` holds frontend answer normalization and accepted-answer matching for the browser game. `client/src/types.ts` holds frontend TypeScript types.

Persisted game state has a status of `playing`, `solved`, `revealed`, or
`failed`. Correct and exhausted-guess outcomes open the shared result dialog.
Reveal Song moves a playing game immediately to `revealed`; after any terminal
outcome it becomes View Result, while the other guess controls remain disabled.
Solved and manually revealed results may embed the configured YouTube video.
Failed results preserve the answer-only behavior.

Legacy stored records with `isSolved: true` migrate to `solved`; unsolved
records with five guesses migrate to `failed`; other legacy records migrate to
`playing`. A terminal result does not automatically reopen when a saved puzzle
is revisited.

The future Python API should own its own server-side normalization and validation logic. If that behavior becomes more complex, keep frontend and backend behavior aligned through shared fixture cases rather than a root TypeScript package.

Run `npm run typecheck` from `client/` to check the TypeScript source without creating build output.

The frontend package disables npm lifecycle scripts with `ignore-scripts=true` in `client/.npmrc`. App-owned puzzle index generation is therefore called explicitly from the `dev` and `build` scripts instead of relying on npm `predev` or `prebuild` hooks.

## Backend Boundary

`api/` is deliberately a placeholder. Do not add a running backend until the game needs server-owned behavior, such as:

- hiding answers from the frontend
- validating guesses server-side
- accounts or identity
- leaderboards
- admin publishing workflows
- analytics events that should not be client-only

A likely first backend would be a small FastAPI service with routes such as `GET /puzzles/today` and `POST /guesses`. Later, that boundary can map onto AWS API Gateway, Lambda, S3, DynamoDB, or another AWS service depending on the feature.

## Build Output

Vite builds the frontend into `client/dist/`. The project Vite config copies released content into `client/dist/content` so production builds preserve the same `/content/...` URLs used in local development.

Development serves `client/content/` directly, including future dated puzzle folders so new puzzles can be authored and checked locally. Each daily puzzle lives at `content/puzzles/YYYY-MM-DD/puzzle.json`, with that puzzle's `.webp` panel images in the same folder. The dated folder name is the puzzle id; `puzzle.json` should not include a duplicate `id` field. The generated `content/puzzles/index.json` file contains date ids, such as `2026-07-05`, rather than JSON filenames.

Production builds filter that content copy: only today-or-earlier `content/puzzles/YYYY-MM-DD/` directories are copied, `dist/content/puzzles/index.json` is generated from those released directories, and future dated puzzle directories are skipped entirely. Shared non-dated assets, such as `content/misc/` and `content/how-to-play/`, are still copied.

The browser also shows a simple future-puzzle page if someone manually requests a future dated puzzle URL. That is only a user-facing guard; excluding future JSON from production builds is what prevents static puzzle answers from shipping.

The npm dev and preview scripts bind Vite to `0.0.0.0`. This makes local development friendlier in WSL because the site can be reached from either the Linux environment or a Windows browser, depending on how WSL forwards localhost on the machine.

In Vite dev mode, puzzle progress is not persisted. This keeps reloads and server restarts clean while testing the game loop. Production builds still persist progress in `localStorage`.

## Current Principle

Keep the game frontend-only until a backend clearly owns a product responsibility. This keeps the prototype fast to change while preserving clean boundaries for future AWS work.
