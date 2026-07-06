import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = import.meta.dirname;
const repoRoot = resolve(projectRoot, '..');
const contentDirectory = resolve(repoRoot, 'content');
const outputDirectory = resolve(projectRoot, 'dist');

function copyContent() {
  return {
    name: 'copy-content',
    closeBundle() {
      if (existsSync(contentDirectory)) {
        cpSync(contentDirectory, resolve(outputDirectory, 'content'), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  root: projectRoot,
  build: {
    outDir: outputDirectory,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
      },
    },
  },
  plugins: [copyContent()],
});