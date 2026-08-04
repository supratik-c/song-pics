import { defineConfig } from 'vitest/config';

// Two projects, two DOM realities: browser code renders through the real
// DOM (happy-dom) instead of hand-rolled fakes; build scripts stay in Node
// since they read/write the filesystem and never touch the DOM.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'browser',
          environment: 'happy-dom',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'scripts',
          environment: 'node',
          include: ['scripts/**/*.test.mjs'],
        },
      },
    ],
  },
});
