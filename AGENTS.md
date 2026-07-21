# AGENTS.md

## Product intent

Badly Drawn Bangers is a light-hearted daily browser game: players identify a song from a sequence of deliberately rough, hand-drawn clue images. Keep the drawings gloriously bad, the copy playful, and the experience itself polished, quick, and understandable.

The current product is intentionally frontend-only. Prefer the smallest change that improves the game without adding framework, service, or infrastructure complexity.

Repository documentation calls the product “Badly Drawn Bangers,” while the current browser UI says “Sketchy Songs.” Treat that as an unresolved naming decision: do not rename one surface piecemeal or invent a third name. Keep any touched user-facing surface internally consistent and flag product-wide naming changes for an explicit decision.

## Repository map

- `client/` is the only running application. It is a strict TypeScript, Vite, and plain DOM/CSS site.
- `client/index.html` owns the static semantic shell.
- `client/src/main.ts` is the browser entry point.
- `client/src/app.ts` coordinates loading, events, state changes, and rendering.
- `client/src/game.ts` owns answer normalization and accepted-answer matching.
- `client/src/puzzleLoader.ts` selects archive/today puzzles and fetches content.
- `client/src/render.ts` owns DOM output for puzzles and game state.
- `client/src/storage.ts` owns per-puzzle persistence. Development deliberately starts clean; production uses `localStorage`.
- `client/src/publicPath.ts` makes runtime asset URLs work both at `/` and under a GitHub Pages repository base path.
- `client/src/puzzleDates.ts` owns date-id display and release checks.
- `client/src/types.ts` is the shared frontend data contract.
- `client/src/styles.css` contains the entire visual system and responsive layout.
- `client/content/` is source content, including the daily puzzle directories and shared art.
- `client/scripts/` derives puzzle metadata from the content tree.
- `client/vite.config.js` builds the app and copies only released content to `dist/`.
- `docs/architecture.md` records the current architectural decisions.
- `ade.md` is a short, publisher-facing release note and may lag behind the canonical workflow in `README.md`.
- `api/` and `infra/` are placeholders, not active projects.

Read the files relevant to a change before editing them. If implementation and documentation disagree, verify runtime/build behavior, fix stale documentation when it is in scope, and do not blindly preserve a contradiction.

Always read the architecture doc to ensure your understanding is current, and also update that doc afterwards.

## Architectural guardrails

- Keep this a dependency-light, framework-free client while its behavior remains simple. Do not introduce React, a state library, a CSS framework, or another build layer without a demonstrated product need.
- Do not create a backend merely to reorganize frontend behavior. A backend becomes justified when the server must own secrets or authority, for example hidden answers, server-validated guesses, accounts, leaderboards, administration, or server-side analytics.
- Keep responsibilities in their current modules. Pure game rules belong in `game.ts`; content selection/fetching in `puzzleLoader.ts`; DOM construction in `render.ts`; browser persistence in `storage.ts`; orchestration and event handling in `app.ts`.
- Keep domain types explicit and maintain strict TypeScript. Validate data at external boundaries instead of spreading unchecked casts throughout the app.
- Construct UI with DOM APIs and `textContent`, not untrusted `innerHTML`.
- Runtime paths must work with Vite's `BASE_URL`. Pass content and asset paths through `resolvePublicPath`; do not assume the site is hosted at the domain root.
- Preserve the URL archive behavior: no `puzzle` query parameter means the latest released puzzle, and `?puzzle=YYYY-MM-DD` selects an archive entry.
- Preserve future-content protection. Development may serve future puzzle folders for authoring, but production builds must exclude future puzzle JSON and images. The future-puzzle screen is only a friendly UI guard, not the security boundary.
- Answers are currently present in static JSON and therefore discoverable by a determined player. Do not describe the frontend-only implementation as secret or tamper-proof.

## Daily puzzle content

Each puzzle is a directory at `client/content/puzzles/YYYY-MM-DD/`. The directory name is its ID and release date. Use a real, zero-padded calendar date; the current scripts recognize the shape but do not fully reject impossible dates.

The directory must contain:

- `puzzle.json`
- at least one numerically named panel image, such as `1.webp`, `2.webp`, and `3.webp`

Panel filenames may have gaps and may use any integer name; numeric value controls display order. Supported generated-manifest formats are AVIF, GIF, JPEG, PNG, and WebP. Prefer compressed WebP for new hand-drawn raster panels. Keep important clue content inside a crop-safe composition because the current grid displays images at a `4 / 3` aspect ratio with `object-fit: cover`.

`puzzle.json` follows this shape:

```json
{
  "songClue": "Playful non-spoiler clue heading",
  "songTitle": "Canonical Song Title",
  "artist": "Artist Name",
  "youtubeURL": "https://www.youtube.com/watch?v=...",
  "acceptedAnswers": ["Canonical Song Title"]
}
```

Rules for puzzle data:

- Do not add an `id`; it is derived from the dated directory.
- `songClue` should be short, funny, and useful without directly revealing the answer.
- Include the canonical song title in `acceptedAnswers`, plus genuinely useful alternate titles or common spellings.
- Do not add duplicates that differ only by case, punctuation, accents, spacing, or `&` versus `and`; answer normalization already handles those differences.
- Guesses may include the artist name; normalization removes it before matching. Do not encode every `Song by Artist` permutation.
- Keep answers at or below the client limit in `constants.ts`.
- `youtubeURL` is optional. When present, use a valid `youtube.com`, `www.youtube.com`, or `youtu.be` video URL supported by `render.ts`.
- Puzzle panels are normally inferred from numeric image filenames. Use an explicit `panels` array only when inference cannot represent the intended content, and ensure its paths still resolve under the deployment base.
- Treat song/artist data as a spoiler: do not expose it in pre-solve headings, captions, image filenames, alt text, logs, or share copy.

`client/content/puzzles/index.json` and `panels.json` are generated, gitignored files. Never hand-edit or treat them as source. Run `npm run generate:puzzle-index` (or `dev`/`build`, which runs it automatically) after content changes. Production regenerates a released-only version inside `dist`.

Release filtering uses the build machine's local calendar date. Be especially careful with date-boundary behavior and CI's timezone when publishing around midnight.

## Game behavior to preserve

- A player gets five non-duplicate normalized guesses by default.
- Normalization is case-insensitive, removes accents and punctuation, converts `&` to `and`, collapses whitespace, and strips matching artist words.
- Submitting only the artist is invalid and reveals the artist hint rather than consuming a guess.
- A solved game reveals the canonical song and artist and embeds the optional YouTube video.
- Exhausting guesses reveals the answer without embedding the video.
- State is keyed by puzzle ID. Vite development does not persist progress; production does.
- Archive entries are sorted newest first and future dates are not playable.

If these rules change, update implementation, types/constants, user-facing text, and architecture documentation together. Add focused automated coverage for normalization/date logic when introducing a test runner or when a regression makes that investment worthwhile.

## Web and visual design

The design language is “bad drawings in a confidently made game,” not a generic polished SaaS interface.

- Preserve the warm graph-paper background, ink-dark outlines, cream card, offset hard shadow, bold primary accents, oversized title, and informal handwritten typography.
- Prefer a small reusable palette and spacing rhythm over one-off values. New controls should look like part of the existing tactile, outlined system.
- Humor should be warm, concise, and inclusive. Avoid copy that punches down or makes the interface harder to understand.
- Let the clue drawings remain the visual focus. UI decoration must not compete with, crop away, or accidentally disclose the clues.
- Design mobile-first down to the existing 320 px minimum and check a wide desktop layout. Controls must not overflow, and primary actions should remain comfortably tappable (roughly 44 px targets).
- Use semantic HTML and native controls first. Every input needs a visible label; every control needs an accessible name; all actions must be keyboard-operable.
- Preserve meaningful focus indicators. Hover cannot be the only signal, and color cannot be the only way to convey state.
- Use live regions deliberately for validation and game feedback; avoid duplicate or excessively chatty announcements.
- Panel alt text must not spoil the answer. If a drawing can be described without solving it, provide concise useful alt text through a future content field; otherwise use an appropriate neutral description rather than leaking song metadata.
- Maintain readable contrast and honor `prefers-reduced-motion` if animation is introduced.
- Avoid layout shifts: give media dimensions/aspect ratios, and keep embedded content responsive.

For visible changes, inspect at least a narrow mobile viewport and a desktop viewport. Exercise initial, invalid guess, repeat guess, artist reveal, solved, failed, archive, load-error, and future-puzzle states as relevant to the change.

## Local workflow

Use Node 22.12 or newer, matching GitHub Actions' Node 22 line and Vite's supported runtime.

From `client/`:

```bash
npm ci
npm run typecheck
npm run build
```

Do not read or parse node_modules/ to keep input tokens to a minimum.
Do not try to run the dev server locally. Instead, after npm run build, explore the files you need in the create dist/ folder and assess them directly.


Notes:

- `client/.npmrc` sets `ignore-scripts=true`. Keep dependency lifecycle scripts disabled by default. Review any dependency that requires an install script and prefer a narrow, explicit exception.
- `npm run dev` and `npm run preview` bind to `0.0.0.0` for WSL/container access.
- `dist/`, `node_modules/`, and generated puzzle manifests are not source and should not be committed.
- Keep `package-lock.json` synchronized with `package.json`; use `npm ci` for reproducible verification and the appropriate npm install command only when intentionally changing dependencies.

## Verification expectations

Verify in proportion to the change, and report commands that could not run.

- Documentation-only change: review links, paths, commands, and claims against the repository.
- Puzzle-content change: run `npm run generate:puzzle-index`, inspect panel ordering and image crops, validate JSON fields/answers, and build before release.
- TypeScript/game change: run `npm run typecheck` and `npm run build`; manually exercise the affected states until automated tests exist.
- CSS/HTML/render change: run typecheck/build, then inspect keyboard behavior and narrow/wide layouts plus all affected states.
- Build/path/date change: build once with the default base and once with a project base such as `VITE_BASE_PATH=/badly-drawn-bangers/`; inspect `dist/content` to ensure future puzzles are absent and shared assets/released metadata are present.
- Dependency or workflow change: use a clean `npm ci`, then match the checks in `.github/workflows/deploy-pages.yml`.

Do not claim a check passed if its dependency was missing or only a different command ran.

## Change discipline

- Make focused edits and preserve unrelated user work.
- Do not edit generated files or build artifacts to mask a source problem.
- Avoid broad refactors during a small feature or content update.
- Add dependencies only when their ongoing cost is justified; browser and platform APIs are preferred for this small app.
- Update `README.md` or `docs/architecture.md`, and `AGENTS.md` when setup, publishing, deployment, boundaries, or durable game behavior changes.
- Keep deployment compatible with GitHub Pages and the `client/dist` artifact expected by the existing workflow.
