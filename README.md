# Scribble Bops

A game about guessing songs from badly drawn art in Paint.

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

You can also run the client in a VS Code Dev Container. Reopen this repository
in the container, wait for dependencies to install, then run `npm run dev` from
the default terminal. The Vite client port is forwarded automatically.

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

The public site deploys to GitHub Pages from `client/dist` using GitHub Actions.
GitHub Pages remains the production host until a Cloudflare migration is
explicitly completed.

In GitHub, open the repository settings and set `Pages -> Build and deployment -> Source` to `GitHub Actions`. Push to `main`, then open:

```text
https://<your-github-user>.github.io/song-pics/
```

The workflow sets `VITE_BASE_PATH` from the GitHub repository name so Vite assets and copied puzzle content resolve correctly from the GitHub Pages project URL.

An inactive Cloudflare Workers Static Assets deployment is scaffolded in
`.github/workflows/deploy-cloudflare.yml`. It has no push or schedule trigger:
it can only be started manually, and its job remains skipped unless the
`confirm_deploy` checkbox is selected. Its Worker name uses the canonical
`scribble-bops` slug. Before using it:

1. Create a Cloudflare API token from the `Edit Cloudflare Workers` template
   and scope it to only the target account.
2. Find that account's Cloudflare account ID.
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions
   repository secrets. Never commit either value.
4. Manually run `Deploy Cloudflare (manual only)`, select `confirm_deploy`, and
   validate the resulting `*.workers.dev` site.
5. After buying the final domain, attach its canonical hostname and configure
   the alternate hostname as a redirect. Cloudflare DNS and Web Analytics are
   dashboard configuration, not deployment secrets.

Do not disable GitHub Pages until the Cloudflare site has been checked for
domain-root asset paths, released-only puzzle content, and canonical-domain
redirects. Automatic Cloudflare deployment should only be enabled after that
cutover is complete.

## Architecture

Start with [docs/architecture.md](docs/architecture.md), which links to the
detailed gameplay, frontend, and content-delivery architecture.

At runtime, `client/src/main.ts` composes browser adapters and starts
`client/src/app.ts`. Pure game transitions live in `game.ts`; static content is
loaded and validated at loader boundaries; `storage.ts` and `completion.ts`
provide replaceable progress boundaries; and focused modules under
`client/src/views/` own DOM output. `client/src/styles.css` preserves cascade
order while importing the focused stylesheets under `client/src/styles/`.
