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
  "doodledBy": "Panel artist name or handle",
  "songTitle": "Canonical Song Title",
  "artist": "Artist Name",
  "youtubeURL": "https://www.youtube.com/watch?v=...",
  "acceptedAnswers": ["Canonical Song Title"],
  "lyricLines": ["Line matching panel 1", "Line matching panel 2"]
}
```

Required strings and `acceptedAnswers` must be non-empty. The canonical title
must have a matching accepted answer after normalization, and accepted answers
must not contain normalized duplicates. `youtubeURL` is optional and must use a
supported `youtube.com` or `youtu.be` watch/embed form, or an exact
`youtube-nocookie.com` embed form, with or without the `www` host prefix. The
client extracts the validated video ID and always constructs a canonical
`youtube-nocookie.com` iframe URL and `youtube.com` watch URL; authored query
parameters are not carried into either output. The ID, formatted date, issue
number, and panels are runtime-derived fields and do not belong in source JSON.
Any unknown field is rejected. Panel metadata is always generated from the
files in the puzzle directory.

`doodledBy` is an optional non-empty panel artist name or handle. It is
non-spoiler clue metadata displayed beneath the panels and is not included in
archive metadata or share copy.

`lyricLines` is optional. An omitted or empty array means the puzzle has no
terminal lyric captions. When non-empty, every entry must be a non-empty string
and the array must contain exactly one line per numeric panel. Lines map by
position after panel filenames are numerically sorted, so the first line belongs
to the first displayed panel even when filenames contain gaps.

Panel filenames may have numeric gaps; their integer values control display
order. Metadata generation recognizes AVIF, GIF, JPEG, PNG, and WebP. New
hand-drawn rasters should normally use compressed WebP on an 800 × 600 (4:3)
canvas. `client/scripts/convert.sh` converts PNG and JPEG panels and resizes
WebP panels that do not already match those dimensions. Important clue content
must remain crop-safe because the grid uses a 4:3 frame with
`object-fit: cover`.

Song, artist, and lyric data are spoilers. Pre-solve headings, captions,
filenames, alt text, logs, and share copy must not expose them.

Puzzle share pages use the first numerically ordered panel already present in
the puzzle directory. Their dated URLs, metadata, alt text, and invitation copy
remain neutral; no duplicate share image is authored or emitted. Browser share
payloads contain the invitation and dated URL rather than an image attachment,
leaving a receiving app to fetch the first panel when it creates a link preview.

Reusable How to Play content lives in `client/content/how-to-play/`; its
manifest is validated lazily in the browser and its panel paths are relative to
that directory. Interface-owned assets live in `client/src/assets/ui/` and are
handled by Vite. Within that directory, reusable logo art, decorative line art,
and raster surfaces belong in `branding/`, `doodles/`, and `textures/` when
introduced. Locally hosted fonts and licenses live in `fonts/`.

Each locally hosted font directory includes its upstream licence notice. “The
Legal Stuff” page links to each notice through a Vite asset URL, so
production emits the exact `OFL.txt` content alongside the font files without
embedding the full text in the page or relying on source-repository access.

## Generated metadata

`client/scripts/generatePuzzleIndex.mjs` scans dated puzzle directories. It
creates an ascending, non-spoiler archive index containing `id` and `songClue`,
plus a panel manifest whose entries follow numeric filename order. Generation
fails early for impossible dates, missing or invalid puzzle JSON, missing
numeric panels, invalid required values or videos, a missing canonical accepted
answer, normalized duplicate answers, and non-empty lyric arrays whose length
does not match the panel count.

`puzzleConventions.mjs` owns path, date-ID, and panel-file conventions;
`puzzleValidation.mjs` owns authored JSON, answer, and video validation; and
`puzzleMetadata.mjs` owns filesystem extraction and coordinates those rules.
They remain separate because changing a naming convention, a content contract,
and how metadata is read are different responsibilities.

`client/content/puzzles/index.json` and `panels.json` are generated and
gitignored. They are never source and must not be hand-edited. The `dev` and
`build` scripts generate them explicitly because npm lifecycle scripts are
disabled in `client/.npmrc`.

Production builds also generate `dist/share/YYYY-MM-DD/index.html` from the
built application shell for each released puzzle. Each page supplies static
Open Graph and Twitter metadata, including an absolute image URL for the
puzzle's existing first panel, its media type and accessible alternative, and
a canonical dated URL. HTTPS builds also identify the secure image URL. Share
HTML is a build artifact and is not committed; images remain only under
`dist/content/puzzles`.

## Runtime paths and loading

The browser fetches the generated archive, selected puzzle JSON, inferred
panels, How to Play manifest, and build-version manifest as runtime content.
Loaders resolve same-origin paths through `resolvePublicPath`, then use a small
`fetchStaticJson` boundary that defaults to `no-store`, handles unsuccessful
status codes, and accepts a complete type guard. Archive, panel, puzzle, and
tutorial JSON opt into normal HTTP caching because their resolved URLs include
the current build identifier. The unversioned build manifest retains
`no-store`. Reusable primitives such as record and non-empty-string checks live
in `validation.ts`; puzzle JSON, panel manifests, tutorial data, archive data,
and build-version data are validated before entering application code.

After the deployment check, puzzle loading starts the archive index first. A
future request awaits only that index so it can render archive navigation
without requesting future puzzle or panel data. Other requests load the panel
manifest alongside the index. A valid non-future archive ID also starts its
puzzle JSON speculatively; if the index does not contain that ID, the unused
result is ignored and the resolved latest puzzle is loaded instead. No or
invalid ID waits for the index to select the latest puzzle before requesting
its JSON.

Source puzzle JSON uses the single authored shape documented above. Runtime
types distinguish `PuzzleClue` from `PuzzleSolution` and combine them as
`Puzzle`, allowing code to accept only the data it needs while static delivery
still ships both.
Puzzle, panel, tutorial, and miscellaneous content URLs pass through
`resolvePublicPath`, which applies Vite's `BASE_URL` and adds the current build
identifier. External URLs are returned unchanged. The build-version check
deliberately constructs its own base-aware URL with a fresh check value so it
can discover a newer build.

The browser recognizes base-aware `/share/YYYY-MM-DD/` paths before loading a
puzzle and normalizes them to `?puzzle=YYYY-MM-DD`. Share controls always emit
the dated entry URL, including for the latest issue, so an old invitation cannot
start selecting a newer daily puzzle.

This path boundary is required for both domain-root hosting and GitHub Pages
project hosting. Imported JavaScript, CSS, and UI assets use Vite's normal
content-hashed paths instead.

The build has three HTML entries: the game at `index.html`, the static legal
information at `legal.html`, and a static `404.html` served for unmatched
paths. Their navigation and font-notice URLs use Vite's public base, including
when the built game shell is copied into a dated share directory, so the
links remain valid at `/` and beneath `/song-pics/`.

`client/public/` is copied verbatim into `dist/` by Vite's default `publicDir`
behavior. It currently holds only `_headers`, a Cloudflare Workers Static
Assets header-rule file (see
[Deployment and cache coherence](#deployment-and-cache-coherence)); it is a
fourth asset mechanism alongside runtime content (`resolvePublicPath`),
content-hashed bundles (Vite `base`), and static HTML links (`%BASE_URL%`).
`_headers` is inert on GitHub Pages.

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
- released-only share entry pages are generated without copying panel images;
- shared non-dated content remains available.

The future-puzzle screen improves the experience for manually entered URLs but
is not the security boundary. Production exclusion prevents future static
answers and panels from shipping. Publishing around midnight must account for
the build machine or CI timezone.

## Deployment and cache coherence

Vite builds to `client/dist/`. Three independent pipelines build the same
source; see [cloudflare-migration.md](cloudflare-migration.md) for the
one-time Cloudflare dashboard setup each depends on.

`scribblebops.com` on Cloudflare Workers Static Assets is production,
deployed by [deploy-cloudflare.yml](../.github/workflows/deploy-cloudflare.yml)
on every push to `main` under `client/**` (and by manual dispatch). It
installs with `npm ci`, runs tests, typechecks, converts panel images with
`scripts/convert.sh`, builds with `/` as the Vite base, and deploys the static
`dist` directory with `wrangler deploy`; it introduces no Worker script,
function, backend, or runtime binding — `client/wrangler.jsonc` declares only
an `assets` directory. The job fixes the release-filter timezone to `TZ: UTC`
so the release-date boundary matches the previous GitHub Actions default.

`dev.scribblebops.com` is a private preview, deployed by
[deploy-cloudflare-dev.yml](../.github/workflows/deploy-cloudflare-dev.yml) on
every same-repo pull request under `client/**` (forked PRs cannot see the
deploy secrets and are skipped). It runs the identical build and test steps
and deploys with `wrangler deploy --env dev`, which selects the `dev`
environment in `client/wrangler.jsonc` — a separate Worker
(`scribble-bops-dev`) that inherits `assets` and `compatibility_date` from the
top level but overrides `name`, `routes`, and disables both `workers_dev` and
`preview_urls`, so the only way to reach it is the custom domain. That domain
is gated by Cloudflare Access (email allowlist), configured entirely in the
dashboard — there is no repository-side authentication. The dev preview
deploys **released content only**: it reuses the same build (no content or
future-puzzle filter is bypassed), so it shows exactly what production shows,
not an authoring preview of unreleased puzzles.

`deploy-pages.yml` keeps building the same content to GitHub Pages in parallel
as a warm standby, in case Cloudflare or the domain has an incident. All three
workflows watch the same `client/**` paths and run independently; only the
Cloudflare ones require secrets.

Both Cloudflare workflows require `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets. The production Worker uses the
canonical `scribble-bops` product slug in `client/wrangler.jsonc`, which also
declares the `scribblebops.com` custom-domain route. The token must use the
narrowly scoped Workers edit permission for the target account. DNS, the
`www` → apex redirect, Web Analytics, and the dev Access policy are Cloudflare
dashboard configuration rather than repository secrets or files — except
cache headers, which live in `client/public/_headers` because Cloudflare
reads that file from the deployed assets directory and applies it to both
Workers. That file sets long, immutable caching on `/assets/*`
(content-hashed) and `/content/*` (every runtime URL carries `?v=<buildId>`
via `resolvePublicPath`), and deliberately leaves `build-version.json` and
HTML documents on Cloudflare's default revalidate-always behavior.

Each build emits `build-version.json`. CI derives `VITE_BUILD_ID` from the
commit and workflow run; local builds use `local`. Before starting the game, a
production client requests the version file with a unique non-cached URL. A
mismatch triggers one reload carrying a temporary `_deployment` query value;
other query parameters are preserved. The temporary value is removed after the
new build loads. Failure or invalid version data does not block the game. This
is why `build-version.json` must never receive long-lived caching from
`_headers` or a CDN rule.

Runtime content URLs include the build ID. Browsers can reuse cached JSON and
images within one deployment, while a new build ID creates new cache keys so
replaced content is not reused across deployments.

`VITE_PUBLIC_SITE_URL` supplies the absolute canonical base used in social
metadata. It is `https://scribblebops.com/` for both the Cloudflare production
build and the GitHub Pages standby build, so the standby mirror's OG and
canonical tags point at the real site rather than at itself. The dev preview
build is the one exception: it sets `https://dev.scribblebops.com/` so its own
generated share pages are self-consistent and actually testable there.

## Cross-runtime fixtures

Shared JSON fixtures define answer-normalization and date cases, including
calendar validity and leap-day behavior. Browser TypeScript tests and build
scripts both execute the applicable cases. A future backend should consume the
same fixtures so independently implemented validation remains aligned without
forcing the current client and scripts into one runtime package.
