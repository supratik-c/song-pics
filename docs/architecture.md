# Architecture

Badly Drawn Bangers is a local-first browser game. The current architecture is intentionally small: the frontend loads puzzle data and panel images from local files, checks guesses in the browser, and stores daily progress in `localStorage` for production builds.

## Directory Structure

```text
web/              Browser game frontend
api/              Future backend boundary
content/          Puzzle metadata and storyboard image assets
infra/            Future AWS infrastructure definitions
docs/             Project documentation
```

The repo keeps `web/` and `api/` at the root instead of nesting them under `apps/`. That is enough structure for one frontend and one future backend without adding an extra directory level.

## Frontend

`web/` contains the playable website and owns the TypeScript toolchain. The browser entrypoint is `web/src/main.ts`. Vite runs from `web/` and uses `web/index.html` as the app entrypoint. During development, run:

```bash
cd web
npm run dev
```

The current app loads today's puzzle from:

```text
/content/puzzles/2026-07-05.json
```

Panel image paths also live under `/content`, for example:

```text
/content/images/2026-07-05/panel-1.svg
```

## Content

`content/` is the source of truth for daily puzzles and storyboard images. Keeping content outside `web/` makes it easier to add publishing tools, validation scripts, or a backend later without mixing game data into UI code.

## Frontend Game Rules

`web/src/game.ts` holds frontend TypeScript types, answer normalization, and accepted-answer matching for the browser game.

The future Python API should own its own server-side normalization and validation logic. If that behavior becomes more complex, keep frontend and backend behavior aligned through shared fixture cases rather than a root TypeScript package.

Run `npm run typecheck` from `web/` to check the TypeScript source without creating build output.

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

Vite builds the frontend into `web/dist/`. The project Vite config also copies `content/` into `web/dist/content` so production builds preserve the same `/content/...` URLs used in local development.

The npm dev and preview scripts bind Vite to `0.0.0.0`. This makes local development friendlier in WSL because the site can be reached from either the Linux environment or a Windows browser, depending on how WSL forwards localhost on the machine.

In Vite dev mode, puzzle progress is not persisted. This keeps reloads and server restarts clean while testing the game loop. Production builds still persist progress in `localStorage`.

## Current Principle

Keep the game frontend-only until a backend clearly owns a product responsibility. This keeps the prototype fast to change while preserving clean boundaries for future AWS work.