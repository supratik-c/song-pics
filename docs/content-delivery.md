# Content Delivery Architecture

This document describes puzzle authoring, generated metadata, runtime paths,
release filtering, caching, and deployment. See
[architecture.md](architecture.md) for the system overview.

## Source content

`client/content/` is the source of truth while the game remains frontend-only.
Each daily puzzle lives in `client/content/puzzles/YYYY-MM-DD/`. The directory
name is both its ID and release date and must be a real, zero-padded calendar
date. Metadata generation rejects malformed or impossible dates before a build.
Each directory contains a valid `puzzle.json` and at least one numerically named
panel image.

Puzzle JSON has this source shape:

```json
{
  "songClue": "Playful non-spoiler clue heading",
  "songTitle": "Canonical Song Title",
  "artist": "Artist Name",
  "youtubeURL": "https://www.youtube.com/watch?v=...",
  "acceptedAnswers": ["Canonical Song Title"]
}
```

Required strings and `acceptedAnswers` must be non-empty. The canonical title
must have a matching accepted answer after normalization, and accepted answers
must not contain normalized duplicates. `youtubeURL` is optional and must use a
supported `youtube.com`, `www.youtube.com`, or `youtu.be` video form. The ID,
formatted date, and issue number are runtime-derived fields and do not belong in
source JSON. Panels are normally inferred; an explicit `panels` array is
available only when filename inference cannot express the intended content.

Panel filenames may have numeric gaps; their integer values control display
order. Metadata generation recognizes AVIF, GIF, JPEG, PNG, and WebP. New
hand-drawn rasters should normally use compressed WebP on an 800 × 600 (4:3)
canvas. `client/scripts/convert.sh` performs that conversion. Important clue
content must remain crop-safe because the grid uses a 4:3 frame with
`object-fit: cover`.

Song and artist data are spoilers. Pre-solve headings, captions, filenames, alt
text, logs, and share copy must not expose them.

Reusable How to Play content lives in `client/content/how-to-play/`; its
manifest is validated lazily in the browser and its panel paths are relative to
that directory. Interface-owned assets live in `client/src/assets/ui/` and are
handled by Vite. Within that directory, reusable logo art, decorative line art,
and raster surfaces belong in `branding/`, `doodles/`, and `textures/` when
introduced. Locally hosted fonts and licenses live in `fonts/`.

## Generated metadata

`client/scripts/generatePuzzleIndex.mjs` scans dated puzzle directories. It
creates an ascending, non-spoiler archive index containing `id` and `songClue`,
plus a panel manifest whose entries follow numeric filename order. Generation
fails early for impossible dates, missing or invalid puzzle JSON, missing
numeric panels, invalid required values or videos, a missing canonical accepted
answer, and normalized duplicate answers.

`puzzleConventions.mjs` owns path, date-ID, and panel-file conventions;
`puzzleValidation.mjs` owns authored JSON, answer, and video validation; and
`puzzleMetadata.mjs` owns filesystem extraction and coordinates those rules.
They remain separate because changing a naming convention, a content contract,
and how metadata is read are different responsibilities.

`client/content/puzzles/index.json` and `panels.json` are generated and
gitignored. They are never source and must not be hand-edited. The `dev` and
`build` scripts generate them explicitly because npm lifecycle scripts are
disabled in `client/.npmrc`.

## Runtime paths and loading

The browser fetches the generated archive, selected puzzle JSON, inferred
panels, How to Play manifest, and build-version manifest as runtime content.
Loaders resolve same-origin paths through `resolvePublicPath`, then use a small
`fetchStaticJson` boundary that applies `no-store`, handles unsuccessful status
codes, and accepts a complete type guard. Reusable primitives such as record
and non-empty-string checks live in `validation.ts`; puzzle JSON, panel
manifests, tutorial data, archive data, and build-version data are validated
before entering application code.

The source puzzle JSON wire shape is unchanged. Runtime types distinguish
`PuzzleClue` from `PuzzleSolution` and combine them as `Puzzle`, allowing code
to accept only the data it needs while static delivery still ships both.
Puzzle, panel, tutorial, and miscellaneous content URLs pass through
`resolvePublicPath`, which applies Vite's `BASE_URL` and adds the current build
identifier. External URLs are returned unchanged. The build-version check
deliberately constructs its own base-aware URL with a fresh check value so it
can discover a newer build.

This path boundary is required for both domain-root hosting and GitHub Pages
project hosting. Imported JavaScript, CSS, and UI assets use Vite's normal
content-hashed paths instead.

## Production release boundary

Development serves the source content tree, including future puzzle folders,
so upcoming content can be authored. Production builds use a testable
release-copy script module to copy content into `client/dist/content` with a
release filter based on the build machine's local calendar date. The date is
captured once per build so copied directories and generated metadata cannot
disagree across midnight. Vite configuration invokes that module but does not
own its filesystem policy:

- future dated puzzle directories are omitted entirely;
- source generated `index.json` and `panels.json` files are not copied;
- released-only archive and panel manifests are regenerated in `dist`;
- shared non-dated content remains available.

The future-puzzle screen improves the experience for manually entered URLs but
is not the security boundary. Production exclusion prevents future static
answers and panels from shipping. Publishing around midnight must account for
the build machine or CI timezone.

## Deployment and cache coherence

Vite builds to `client/dist/`. The GitHub Actions workflow installs with
`npm ci`, runs tests, typechecks, builds with a repository base path, and
deploys that directory to GitHub Pages.

Each build emits `build-version.json`. CI derives `VITE_BUILD_ID` from the
commit and workflow run; local builds use `local`. Before starting the game, a
production client requests the version file with a unique non-cached URL. A
mismatch triggers one reload carrying a temporary `_deployment` query value;
other query parameters are preserved. The temporary value is removed after the
new build loads. Failure or invalid version data does not block the game.

Runtime content URLs include the build ID so browsers and GitHub Pages do not
reuse stale puzzle JSON or images after replacement under the same filename.

## Cross-runtime fixtures

Shared JSON fixtures define answer-normalization and date cases, including
calendar validity and leap-day behavior. Browser TypeScript tests and build
scripts both execute the applicable cases. A future backend should consume the
same fixtures so independently implemented validation remains aligned without
forcing the current client and scripts into one runtime package.
