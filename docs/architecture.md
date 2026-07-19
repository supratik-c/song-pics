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

Puzzle panel rasters are kept at or below 800 × 600 pixels to limit the static
download size. New source artwork should be resized and compressed before it is
added to a dated puzzle directory.

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
owns its semantic structure: the title panel, the How to Play control, the
archive select, the clue heading, the guess form, the four-cell action grid,
and the feedback regions. `client/src/styles.css` turns those native controls
and regions into straight clue panels and selectively diagonal action panels
without replacing their keyboard-operable hit areas.

`client/src/render.ts` populates the dated puzzle content and the options in the
static archive select. Choosing an archive option preserves the existing URL
contract: the latest puzzle has no `puzzle` query parameter and older puzzles
use `?puzzle=YYYY-MM-DD`.

How to Play and Reveal Song are intentionally presentational placeholders.
They are enabled native buttons with registered no-op handlers, and they do not
change game state, reveal content, show feedback, or navigate. Their eventual
behavior should be implemented only after the corresponding content and game
rules are defined.

## Frontend Game Rules

`client/src/game.ts` holds frontend answer normalization and accepted-answer matching for the browser game. `client/src/types.ts` holds frontend TypeScript types.

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

Production builds filter that content copy: only today-or-earlier `content/puzzles/YYYY-MM-DD/` directories are copied, `dist/content/puzzles/index.json` is generated from those released directories, and future dated puzzle directories are skipped entirely. Shared non-dated assets, such as `content/misc/`, are still copied.

The browser also shows a simple future-puzzle page if someone manually requests a future dated puzzle URL. That is only a user-facing guard; excluding future JSON from production builds is what prevents static puzzle answers from shipping.

The npm dev and preview scripts bind Vite to `0.0.0.0`. This makes local development friendlier in WSL because the site can be reached from either the Linux environment or a Windows browser, depending on how WSL forwards localhost on the machine.

In Vite dev mode, puzzle progress is not persisted. This keeps reloads and server restarts clean while testing the game loop. Production builds still persist progress in `localStorage`.

## Current Principle

Keep the game frontend-only until a backend clearly owns a product responsibility. This keeps the prototype fast to change while preserving clean boundaries for future AWS work.
