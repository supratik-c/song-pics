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
  },
  build: {
    outDir: outputDirectory,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
      },
    },
  },
  plugins: [copyContent(), emitBuildVersion()],
});
