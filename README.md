# Badly Drawn Bangers

A game about guessing songs from badly drawn art in Paint.

## Run Locally

Install dependencies once:

```bash
cd client
npm install
```

Start the local Vite dev server:

```bash
npm run dev
```

Then open the local URL printed by Vite.

If you are opening the site from Windows while the server runs inside WSL, use either the `localhost` URL printed by Vite or the WSL network URL. The dev script binds to `0.0.0.0` so both can work.

## Build

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

In GitHub, open the repository settings and set `Pages -> Build and deployment -> Source` to `GitHub Actions`. Push to `main`, then open:

```text
https://<your-github-user>.github.io/badly-drawn-bangers/
```

The workflow sets `VITE_BASE_PATH=/badly-drawn-bangers/` so Vite assets and copied puzzle content resolve correctly from the GitHub Pages project URL.

## Architecture

See [docs/architecture.md](docs/architecture.md).

The current sample puzzle accepts `Take Me Out` or `Franz Ferdinand Take Me Out`.

