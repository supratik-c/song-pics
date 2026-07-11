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
/content/puzzles/2026-07-05.json
```

Panel image paths also live under `/content`, for example:

```text
/content/images/2026-07-05/panel-1.svg
```

## Content

`client/content/` is the source of truth for daily puzzles and storyboard images while the game is frontend-only. If content later needs publishing tools or backend access, it can move back to a root-level content boundary.

## Frontend Game Rules

`client/src/game.ts` holds frontend answer normalization and accepted-answer matching for the browser game. `client/src/types.ts` holds frontend TypeScript types.

The future Python API should own its own server-side normalization and validation logic. If that behavior becomes more complex, keep frontend and backend behavior aligned through shared fixture cases rather than a root TypeScript package.

Run `npm run typecheck` from `client/` to check the TypeScript source without creating build output.

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

Development serves `client/content/` directly, including future puzzle JSON and image folders so new puzzles can be authored and checked locally. Production builds filter that content copy: only today-or-earlier `content/puzzles/YYYY-MM-DD.json` files are copied, `dist/content/puzzles/index.json` is generated from those released files, and future dated image folders are skipped. Shared non-dated assets, such as `content/images/misc/`, are still copied.

The browser also shows a simple future-puzzle page if someone manually requests a future dated puzzle URL. That is only a user-facing guard; excluding future JSON from production builds is what prevents static puzzle answers from shipping.

The npm dev and preview scripts bind Vite to `0.0.0.0`. This makes local development friendlier in WSL because the site can be reached from either the Linux environment or a Windows browser, depending on how WSL forwards localhost on the machine.

In Vite dev mode, puzzle progress is not persisted. This keeps reloads and server restarts clean while testing the game loop. Production builds still persist progress in `localStorage`.

## Current Principle

Keep the game frontend-only until a backend clearly owns a product responsibility. This keeps the prototype fast to change while preserving clean boundaries for future AWS work.