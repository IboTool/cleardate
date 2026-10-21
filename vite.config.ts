import { defineConfig } from 'vitest/config';

// The app build. The local data editor has its own config in tools/editor/
// and is never part of dist/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
