# Scribble Bops

A game about guessing songs from badly drawn art.

## Run Locally

Install dependencies once:

```bash
cd client
npm install
```

The frontend package sets `ignore-scripts=true` in `.npmrc`, so dependency
install lifecycle scripts such as `preinstall`, `install`, `postinstall`, and
`prepare` are disabled by default. If a future trusted dependency genuinely
requires an install script, prefer a reviewed one-off exception instead of
turning scripts back on globally.

Start the local Vite dev server:

```bash
npm run dev
```

Then open the local URL printed by Vite.

If you are opening the site from Windows while the server runs inside WSL, use either the `localhost` URL printed by Vite or the WSL network URL. The dev script binds to `0.0.0.0` so both can work.

## Build

Run the focused unit and build-script tests:

```bash
cd client
npm test
```

Check TypeScript types:

```bash
cd client
npm run typecheck
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deploy

`https://scribblebops.com` is production, deployed from `client/dist` to
Cloudflare Workers Static Assets by
[deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml) on every push
to `main` under `client/**` (or by manual dispatch). It builds with `/` as the
Vite base and `VITE_PUBLIC_SITE_URL` set to `https://scribblebops.com/`, used
by the generated per-puzzle social-share metadata. The Worker uses the
canonical `scribble-bops` slug and the `scribblebops.com` custom-domain route,
both configured in [client/wrangler.jsonc](client/wrangler.jsonc); cache
headers for content-hashed bundles and versioned puzzle content live in
[client/public/_headers](client/public/_headers), which Cloudflare reads
directly from the deployed assets.

The workflow needs `CLOUDFLARE_API_TOKEN` (an `Edit Cloudflare Workers`
scoped token) and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions repository
secrets. DNS (including the `www` → apex redirect) and Web Analytics are
Cloudflare dashboard configuration, not deployment secrets.

`https://dev.scribblebops.com` is a private preview, deployed by
[deploy-cloudflare-dev.yml](.github/workflows/deploy-cloudflare-dev.yml) on
every same-repo pull request touching `client/**` (or by manual dispatch). It
deploys to the `dev` environment in
[client/wrangler.jsonc](client/wrangler.jsonc) — a separate Worker with its
own custom domain, `workers_dev` and `preview_urls` both disabled. The domain
itself is gated by Cloudflare Access (Zero Trust, free for up to 50 users) with
an email allowlist, configured entirely in the dashboard. It shows released
content only, exactly like production. See
[docs/cloudflare-migration.md](docs/cloudflare-migration.md) for the full
one-time setup checklist for both `scribblebops.com` and
`dev.scribblebops.com`, including the Cloudflare Access application.

`https://supratik-c.github.io/song-pics/` keeps building in parallel from the
same source via [deploy-pages.yml](.github/workflows/deploy-pages.yml) as a
warm standby, in case Cloudflare or the domain has an incident. Its workflow
sets `VITE_BASE_PATH` from the GitHub repository name so Vite assets and
copied puzzle content resolve correctly from the GitHub Pages project URL, but
its `VITE_PUBLIC_SITE_URL` still points at `https://scribblebops.com/` so its
share metadata references the real site. Local builds fall back to a
base-aware localhost URL; set the variable explicitly when inspecting a
production-like share artifact.

## Architecture

Start with [docs/architecture.md](docs/architecture.md), which links to the
detailed gameplay, frontend, and content-delivery architecture.

At runtime, `client/src/main.ts` composes browser adapters and starts
`client/src/app.ts`. Pure game transitions live in `game.ts`; static content is
loaded and validated at loader boundaries; `storage.ts` and `completion.ts`
provide replaceable progress boundaries; and focused modules under
`client/src/views/` own DOM output. `client/src/styles.css` preserves cascade
order while importing the focused stylesheets under `client/src/styles/`.
