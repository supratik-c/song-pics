# UI assets

This directory contains visual assets that belong to the game interface rather
than to an individual puzzle.

- `fonts/` contains locally hosted typefaces and their license files.
- Add reusable title or logo art to `branding/`.
- Add transparent decorative line art to `doodles/`.
- Add raster paper or paint surfaces to `textures/`.

Prefer SVG for scalable line art and compressed WebP for raster artwork. Keep
decorative artwork free of song and artist spoilers. Reference these assets
with relative CSS URLs or TypeScript imports so Vite can fingerprint them and
rewrite their paths for the configured deployment base.

Daily clue panels remain in `client/content/puzzles/`. Runtime content that is
copied without bundling remains in `client/content/`.
