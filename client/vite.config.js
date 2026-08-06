import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { CONTENT_DIRECTORY_NAME } from './scripts/puzzleConventions.mjs';
import {
  copyReleasedContent,
  writeReleasedPuzzleMetadata,
} from './scripts/releaseContent.mjs';
import { writeReleasedPuzzleSharePages } from './scripts/sharePages.mjs';

const projectRoot = import.meta.dirname;
const contentDirectory = resolve(projectRoot, CONTENT_DIRECTORY_NAME);
const outputDirectory = resolve(projectRoot, 'dist');
const basePath = process.env.VITE_BASE_PATH ?? '/';
const buildId = process.env.VITE_BUILD_ID?.trim() || 'local';
const publicSiteUrl = process.env.VITE_PUBLIC_SITE_URL?.trim() ||
  new URL(basePath, 'http://localhost').toString();
// Fresh on every config load, so each `vite dev` start scopes dev-only game
// progress to its own storage namespace (see main.ts). Only read behind an
// `import.meta.env.DEV` check, which Vite statically eliminates from
// production builds along with this value.
const devRunId = String(Date.now());

function emitBuildVersion() {
  return {
    name: 'emit-build-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-version.json',
        source: `${JSON.stringify({ buildId }, null, 2)}\n`,
      });
    },
  };
}

function copyContent() {
  return {
    name: 'copy-content',
    closeBundle() {
      if (existsSync(contentDirectory)) {
        const contentOutputDirectory = resolve(outputDirectory, 'content');
        const releaseDate = new Date();

        copyReleasedContent(contentDirectory, contentOutputDirectory, {
          today: releaseDate,
        });
        writeReleasedPuzzleMetadata(
          projectRoot,
          contentOutputDirectory,
          { today: releaseDate },
        );
        writeReleasedPuzzleSharePages(projectRoot, outputDirectory, {
          publicSiteUrl,
          today: releaseDate,
        });
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  root: projectRoot,
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    'import.meta.env.VITE_DEV_RUN_ID': JSON.stringify(devRunId),
  },
  build: {
    outDir: outputDirectory,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        legal: resolve(projectRoot, 'legal.html'),
        notFound: resolve(projectRoot, '404.html'),
      },
    },
  },
  plugins: [copyContent(), emitBuildVersion()],
});
