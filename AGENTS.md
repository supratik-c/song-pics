# AGENTS.md

## Product intent

Badly Drawn Bangers is a playful daily browser game: players identify a song
from deliberately rough hand-drawn clues. Keep the drawings gloriously bad,
the copy warm, concise, and inclusive, and the experience polished and
understandable. Humor must not punch down or obscure instructions.

The repository calls the product “Badly Drawn Bangers,” while the browser UI
currently says “Scribble Bops.” Treat this as an unresolved naming decision: do
not rename one surface piecemeal or invent another name. Flag a product-wide
rename for an explicit decision.

## Required documentation

Always read `docs/architecture.md` before working. Use its documentation map to
read every detailed architecture document relevant to the task. After a
change, update the relevant detailed document when durable behavior or a
boundary changes; update the overview only for cross-cutting architectural
changes. Do not copy transient implementation detail into documentation.

## Repository boundaries

- `client/` is the only running application: strict TypeScript, Vite, and plain
  DOM/CSS.
- `api/` and `infra/` are future placeholders. Do not add a backend until the
  server must own secrets or authority.
- Keep the client dependency-light. Do not introduce a framework, state
  library, CSS framework, or extra build layer without a demonstrated need.
- Keep responsibilities in their established boundaries: pure rules and
  transitions in `game.ts`, policy in `gameConfig.ts`, content fetching in
  loaders, DOM output in focused `views/`, persistence in `storage.ts`, the
  completion read model in `completion.ts`, orchestration in `app.ts`, and
  concrete dependency composition in `main.ts`.
- Keep domain types explicit and validate data at external boundaries. Use DOM
  APIs and `textContent`, not untrusted `innerHTML`.
- Pass runtime content and asset paths through `resolvePublicPath`; deployment
  must work at `/` and beneath a GitHub Pages repository base.
- Static puzzle answers are discoverable. Never describe the frontend-only
  implementation as secret or tamper-proof.

## Durable behavior

Do not change established game, archive, content-release, or accessibility
behavior incidentally. In particular:

- no `puzzle` query selects the latest release; `?puzzle=YYYY-MM-DD` selects a
  released archive entry;
- production builds must exclude future puzzle JSON and images—the friendly
  future screen is not the security boundary;
- development starts puzzle progress clean, while production persists it by
  puzzle ID;
- issue numbers remain chronological and contiguous across available puzzles;
- user-visible controls remain semantic, keyboard-operable, visibly focused,
  and usable at the 320 px minimum width.

If these behaviors intentionally change, update implementation, types or game
policy, user-facing copy, and the relevant architecture document together.

## Puzzle content

For puzzle-content work, follow `docs/content-delivery.md` and
`docs/gameplay.md`. Do not hand-edit generated `index.json` or `panels.json`.
Keep song and artist spoilers out of pre-solve copy, filenames, alt text, logs,
and share text. Prefer compressed WebP for new raster panels and keep important
content crop-safe in the 4:3 frame.

Use useful accepted-answer alternatives only, always including the canonical
title. Normalization already handles case, punctuation, accents, spacing, `&`
versus `and`, and matching artist words. Do not include normalized duplicates
and keep answers within `GAME_RULES.maxAnswerLength`.

## Visual changes

Follow `docs/frontend.md`. Preserve the established “bad drawings in a
confidently made game” language: graph paper, strong outlines, cream surfaces,
hard shadows, bold accents, and informal typography. New controls must fit the
existing tactile system without competing with clue art.

Use visible labels and accessible names, preserve focus indicators, avoid
color-only or hover-only signals, maintain readable contrast, and use live
regions deliberately. Prevent layout shifts, keep media responsive, and honor
`prefers-reduced-motion` if animation is added.

For affected visible behavior, check a narrow mobile and wide desktop layout.
Exercise relevant initial, invalid, repeat, artist-reveal, solved, failed,
archive, load-error, and future-puzzle states.

## Local workflow

Use Node 22.12 or newer. From `client/`:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Do not read or parse `node_modules/`. Do not run the development server; after
building, inspect the created `dist/` files directly. Generated manifests,
`dist/`, and `node_modules/` are not source and must not be committed.

`client/.npmrc` disables dependency lifecycle scripts. Keep them disabled by
default and review any dependency that requires an exception. Keep
`package-lock.json` synchronized when dependencies intentionally change.

## Verification

Verify in proportion to the change and report commands that could not run:

- Documentation only: verify links, paths, commands, and claims against source.
- Puzzle content: run `npm run generate:puzzle-index` and `npm test`, validate
  JSON and answers, inspect panel ordering and crops, then build.
- TypeScript or game behavior: run tests, typecheck, and build; exercise affected
  states.
- HTML, CSS, or rendering: run tests, typecheck, and build; inspect keyboard
  behavior, narrow/wide layouts, and affected states.
- Build, path, or date behavior: build with the default base and with
  `VITE_BASE_PATH=/badly-drawn-bangers/`; inspect `dist/content` for correct
  released and shared content.
- Dependencies or workflows: start with a clean `npm ci` and match
  `.github/workflows/deploy-pages.yml`.

Do not claim a check passed when its dependency was unavailable or only a
different command ran.

## Change discipline

Read the relevant source before editing. If implementation and documentation
disagree, verify runtime or build behavior and correct stale documentation when
it is in scope. Make focused edits and preserve unrelated user work. Do not edit
generated files or artifacts to hide source problems. Avoid broad refactors
during small features, prefer browser APIs over dependencies, and keep
deployment compatible with GitHub Pages and the `client/dist` artifact.

Update `README.md`, the relevant architecture document, or this file when a
change affects setup, publishing, deployment, architectural boundaries, durable
behavior, or recurring agent guidance.
