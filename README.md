# Badly Drawn Bangers

A game about guessing songs from badly drawn art in Paint.

## Run Locally

Install dependencies once:

```bash
cd web
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
cd web
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

## Architecture

See [docs/architecture.md](docs/architecture.md).

The current sample puzzle accepts `Take Me Out` or `Franz Ferdinand Take Me Out`.

