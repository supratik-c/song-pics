# Cloudflare Migration Runbook

This is the operational checklist for standing up `scribblebops.com`
(production) and `dev.scribblebops.com` (private preview) on Cloudflare. It
complements [content-delivery.md](content-delivery.md), which explains *why*
the deployment is shaped this way; this document is the ordered list of steps
to actually do it.

Everything under "Repo state" is already committed and verified (typecheck,
tests, and both required builds pass). Everything under "Dashboard setup" is
one-time Cloudflare configuration that cannot live in the repository —
`AGENTS.md` intentionally does not track third-party dashboard state.

## Repo state (already done)

- [client/wrangler.jsonc](../client/wrangler.jsonc) declares the production
  Worker (`scribble-bops`, route `scribblebops.com`) and a `dev` environment
  (`scribble-bops-dev`, route `dev.scribblebops.com`) that inherits `assets`
  and `compatibility_date` and overrides only identity and routing.
- [.github/workflows/deploy-cloudflare.yml](../.github/workflows/deploy-cloudflare.yml)
  deploys production on every push to `main` under `client/**`.
- [.github/workflows/deploy-cloudflare-dev.yml](../.github/workflows/deploy-cloudflare-dev.yml)
  deploys the dev preview on every pull request under `client/**` (same-repo
  PRs only — forked PRs cannot see the secrets and the job skips instead of
  failing).
- [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml)
  keeps building the same source to GitHub Pages on push to `main`, as a warm
  standby with no dependency on Cloudflare.
- [client/public/_headers](../client/public/_headers) sets cache headers for
  Cloudflare Workers Static Assets — inert on GitHub Pages.
- [client/404.html](../client/404.html) is a third Vite entry, matching
  `wrangler.jsonc`'s `not_found_handling: "404-page"`.
- [client/legal.html](../client/legal.html) has a real privacy policy. **It
  still contains placeholder controller name/email and effective date** — fill
  those in before advertising the site publicly. See
  [commercial.md](commercial.md).

## Step 1 — Cloudflare account and domain

1. Create (or sign in to) a Cloudflare account on the **Free** plan.
2. Add `scribblebops.com` as a site/zone. Cloudflare will show two nameservers.
3. At your domain registrar, replace the existing nameservers with the two
   Cloudflare gave you. Propagation is usually minutes, occasionally hours.
4. Wait for the Cloudflare dashboard to show the zone as **Active** before
   continuing — Workers Custom Domains require an active zone.

## Step 2 — API token and GitHub secrets

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token** → use the
   **Edit Cloudflare Workers** template. Scope it to the specific account, not
   "All accounts."
2. Copy the account ID shown on the right side of any Cloudflare dashboard
   page for this account.
3. In the GitHub repo: **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

   Both workflows (`deploy-cloudflare.yml` and `deploy-cloudflare-dev.yml`)
   read the same two secrets.

## Step 3 — Validate before attaching any domain

Run **Deploy Cloudflare** via `workflow_dispatch` (Actions tab → select the
workflow → Run workflow) with the current `wrangler.jsonc` (top-level
`workers_dev: true`, no custom domain attached yet — that's the state as
committed). Confirm `https://scribble-bops.workers.dev` serves the app
correctly: puzzles load, archive navigation works, no future puzzle is
reachable, `/legal.html` renders.

Do not attach the custom domain until this passes. `*.workers.dev` is the
pre-DNS smoke test precisely so a broken deploy never touches
`scribblebops.com`.

## Step 4 — Attach the production custom domain

1. Cloudflare dashboard → your Worker (`scribble-bops`) → **Settings →
   Domains & Routes** → confirm `scribblebops.com` is attached (it comes from
   `wrangler.jsonc`'s `routes` on the next deploy once the zone is active; if
   it isn't yet, add it here manually).
2. DNS → add a **proxied** (orange-cloud) `www` CNAME record pointing at
   `scribblebops.com`.
3. Rules → **Redirect Rules** → create a Single Redirect:
   `www.scribblebops.com/*` → `https://scribblebops.com/$1`, status **301**,
   preserve query string.
4. SSL/TLS → Edge Certificates → enable **Always Use HTTPS** and **HTTP
   Strict Transport Security (HSTS)**.
5. Push to `main` (or re-run the workflow) and confirm `https://scribblebops.com`
   serves correctly, `https://www.scribblebops.com/anything` redirects, and
   HTTP redirects to HTTPS.

## Step 5 — Web Analytics (production only)

1. Cloudflare dashboard → **Analytics & Logs → Web Analytics** → **Add a
   site** → `scribblebops.com`.
2. Enable **automatic injection** — this requires the proxied custom domain
   from Step 4 and needs no repository or HTML change; Cloudflare injects the
   beacon at the edge.
3. Load the production site once yourself, then confirm a visit appears in
   the Web Analytics dashboard (may take a few minutes).
4. Do **not** add Web Analytics to `dev.scribblebops.com` — see the caveat at
   the end of Step 8. If dev traffic pollutes the production numbers because
   injection is zone-wide, add a Web Analytics rule excluding the `dev` host.

## Step 6 — Lock down the workers.dev address

Once Steps 3–5 are all verified working on the real domain, `*.workers.dev`
is no longer needed and becomes a second public, unauthenticated,
un-analytics'd origin serving the same content:

1. In `client/wrangler.jsonc`, change the **top-level** `"workers_dev": true`
   to `"workers_dev": false`.
2. Commit, push to `main`, confirm the next deploy succeeds and
   `https://scribble-bops.workers.dev` stops resolving.

This is deliberately the last production step, not the first — see Step 3.

## Step 7 — Cloudflare Access for the dev preview

`dev.scribblebops.com` must never be reachable without authentication; it has
no separate privacy notice or Web Analytics disclosure, so it is not meant for
public traffic.

1. Cloudflare dashboard → **Zero Trust** (free for up to 50 users, no billing
   required to enable). If this is the first time enabling Zero Trust for the
   account, it'll ask you to pick a team name — anything works.
2. **Access → Applications → Add an application → Self-hosted.**
   - Application domain: `dev.scribblebops.com`
   - Session duration: your call (24h is a reasonable default for solo use).
3. Add a policy: Action **Allow**, rule **Emails** → list the addresses that
   should be able to reach the preview (at minimum, your own). Identity method
   **One-time PIN** needs no separate identity provider setup.
4. Save. The domain doesn't need a separate DNS record — attaching the
   `dev.scribblebops.com` Worker Custom Domain route (next step) creates it.

## Step 8 — Verify the dev preview end-to-end

1. Open a pull request that touches `client/**` (or run
   `workflow_dispatch` on **Deploy Cloudflare (dev preview)**). Confirm the
   dev workflow runs and the production workflow does not.
2. Visit `https://dev.scribblebops.com` unauthenticated (private/incognito
   window) — you should hit the Cloudflare Access login screen, not the app.
3. Authenticate with an allow-listed email and confirm the app loads: same
   released puzzles as production, no future puzzle reachable, `/legal.html`
   renders.
4. Confirm `https://scribble-bops-dev.workers.dev` does **not** resolve
   (`workers_dev: false` in the `dev` environment) and that no Preview URL is
   reachable either (`preview_urls: false`).
5. Merge the PR and confirm the reverse: the production workflow runs, the
   dev workflow does not, and `scribblebops.com` is unaffected.

**Caveat — Web Analytics is zone-wide.** If you enabled automatic injection in
Step 5, it may also inject into `dev.scribblebops.com` responses since both
hosts share the `scribblebops.com` zone. Behind Access that's only your own
traffic mixed into production's numbers, which most solo setups can live with;
if it matters, add a Web Analytics rule (Analytics & Logs → Web Analytics →
Rules) excluding the `dev` hostname.

## Planned, not yet implemented — per-puzzle completion analytics

This section records a design that has been agreed but **not built**. No code,
config, or binding described here exists in the repo yet. It's written down
now so the design isn't lost before implementation.

**Purpose.** Cloudflare Web Analytics (Step 5) gives aggregate site traffic
but nothing per-puzzle — `?puzzle=YYYY-MM-DD` collapses into one path and
query strings aren't logged. The goal is per-puzzle difficulty/popularity
data: did a puzzle get solved, how many attempts did it take, roughly how many
distinct people finished it.

**Why this doesn't change the Cloudflare recommendation.** `client/wrangler.jsonc`
can add a `main` Worker script alongside its existing `assets` directory in
the *same* deployment. Cloudflare's `run_worker_first` routing means only
requests to one specific path (e.g. `/api/complete`) invoke the Worker —
every other request, i.e. the entire game, still hits free, unbilled Static
Assets exactly as today. The event sink, Workers Analytics Engine, is free up
to 100k data points/day. No new vendor, no new pipeline, no change to
Steps 1–8 above.

**Why the data is scoped down from "distinguish individual users."** The
original ask was for whatever details could distinguish one visitor from
another — IP, browser, etc. — attached to each completion, for deduplication
ahead of the difficulty analysis. That's more data than the stated purpose
needs and conflicts with this project's existing privacy posture: the
published privacy policy ([client/legal.html](../client/legal.html)) and
[docs/commercial.md](commercial.md) currently promise no operator-side
profiling and that the operator doesn't receive player guesses. Storing raw
IP/UA per event would be a real walk-back of that. The agreed compromise is a
**same-day pseudonymous dedup signal** rather than a persistent identifier —
enough to avoid double-counting a visitor in "how many people finished this
puzzle," without building anything that identifies or tracks them.

**The dedup design, as agreed:**

- A random salt is generated once per UTC calendar day and stored in Workers
  KV with a TTL (~2 days, to tolerate clock skew around midnight — not a
  second valid key, just a safety margin on top of the current day's key).
- On each completion request, the Worker computes
  `HMAC-SHA256(today's salt, CF-Connecting-IP + "|" + User-Agent)`. Neither
  the raw IP nor the raw User-Agent is ever stored — only used in that one
  hash computation and discarded.
- The hash is written as an Analytics Engine **index** (not a blob), alongside
  `puzzleId`/`outcome` as blobs and `attemptsUsed` as a double. Distinct
  visitor counts per puzzle are then read at query time via
  `COUNT(DISTINCT index1)`, not computed at write time.
- Once a day's KV entry expires, that day's hashes become **permanently
  unrecoverable** — not reversible even by the operator. This is the same
  technique Plausible and Fathom use, and is why it avoids needing an
  ePrivacy cookie-consent banner: nothing is stored or read on the visitor's
  device (the ePrivacy consent trigger is specifically about *device*
  storage/access), and the hash's minimization, short lifetime, and
  single-purpose use line up with the criteria regulators such as France's
  CNIL use to exempt first-party audience-measurement analytics from consent.
  GDPR itself still applies (a hash derived from an IP is still processing
  personal data), but that's satisfiable under legitimate interest with a
  disclosed purpose — not a build blocker, a documentation one (see below).
  This isn't a compliance guarantee — treat it the same as this project's
  other non-legal-advice caveats (see [commercial.md](commercial.md) and
  [business.md](business.md)) and verify against current guidance before
  relying on it.
- **Rejected alternative:** a salt derived from a long-lived secret plus the
  date (`HMAC(secret, today)`), which "rotates" without needing KV storage but
  is reversible in principle by anyone holding the secret. The ephemeral-KV
  version was chosen specifically so the irreversibility claim is actually
  true, not just operationally inconvenient to reverse.
- **Scope boundary, agreed explicitly:** the hash distinguishes same-day
  visitors only — not devices, not cross-day archive replays. That's
  acceptable because the game's own state already prevents a single browser
  from re-completing the same puzzle (status latches to terminal), so exact
  headcounts were never achievable anyway; this is an approximation for
  "is this puzzle too easy/hard," not a precise metric.

**Shape of the future implementation**, at a level useful for picking this
back up later:

- New `api/completionWorker.ts` — turns `api/` from placeholder to real,
  matching `api/README.md`'s own stated trigger ("server-side analytics").
  Validates a `{ puzzleId, outcome, attemptsUsed }` body (reject anything
  else), computes the dedup hash, calls `writeDataPoint`, and always responds
  `204`/`400`/`405` without revealing whether the Analytics Engine write
  succeeded — a public beacon endpoint shouldn't give a client (or an
  attacker) any way to distinguish "recorded" from "silently dropped."
- `client/wrangler.jsonc` gains `main`, a
  `run_worker_first: ["/api/complete"]` rule, and two new bindings
  (`kv_namespaces`, `analytics_engine_datasets`). Both bindings are
  **non-inheritable** in Wrangler's config model, so the `dev` environment
  needs its own KV namespace and its own dataset (e.g.
  `scribble_bops_completions_dev`) so dev-preview traffic doesn't pollute
  production difficulty stats. Provisioning would add to Step 2 above:
  `npx wrangler kv namespace create DEDUP_SALT`, once per environment;
  Analytics Engine datasets are created implicitly on first write, no
  separate provisioning step.
- A new `client/src/platform/analyticsReporter.ts` adapter, following the
  existing `platform/completion.ts` pattern (capability-typed,
  `createBrowserX` factory, arrow-function methods, never throws — a blocked
  or failed beacon must not affect gameplay). Fired from `app.ts`'s two
  existing terminal-state transitions (guess submission and reveal-song)
  immediately after `gameStateStore.save`, guarded against re-firing on a
  refresh of an already-finished puzzle, and disabled entirely in dev via the
  same `import.meta.env.DEV` pattern already used for `gameStateStore`.
- Reuses `getPuzzlePerformance` from
  [client/src/domain/performance.ts](../client/src/domain/performance.ts) as
  the payload shape — already exactly `{ puzzleId, outcome, attemptsUsed }`
  with no song/artist spoiler data, no new type to keep in sync.

**Documentation debt this will incur when built** — flagged now so it isn't
missed later, none of it done yet:

- `AGENTS.md`'s "client/ is the only running application" boundary claim
  becomes false and needs a scoped correction.
- `docs/architecture.md`'s framing of the system as purely static needs a
  precise carve-out: this one fire-and-forget beacon, nothing else, gameplay
  unaffected if it's down.
- `client/legal.html` needs a new disclosure describing exactly what's
  collected (puzzle ID, outcome, attempts — never guesses, never song/artist
  data), the daily-rotating irreversible hash and why it exists, and that
  this is a separate channel from Cloudflare Web Analytics.
- `docs/commercial.md`'s "no application collection" bullet and its mandated
  "new privacy review before adding analytics" trigger both need updating to
  point at this feature.

## Ongoing operation

- **Production:** push to `main` → `deploy-cloudflare.yml` → `scribblebops.com`.
- **Dev preview:** open/update a same-repo PR → `deploy-cloudflare-dev.yml` →
  `dev.scribblebops.com`, gated by Access. One PR's preview replaces the last —
  concurrent PRs overwrite each other's preview build. If concurrent previews
  are ever needed, the upgrade path is per-version `wrangler versions upload`
  Preview URLs (each Access-protectable individually) rather than more
  environments.
- **Standby:** push to `main` also rebuilds GitHub Pages independently, with no
  dependency on Cloudflare being healthy.
- Rotate `CLOUDFLARE_API_TOKEN` periodically through the same "Edit Cloudflare
  Workers" template; update the GitHub secret in place.
