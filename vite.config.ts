import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Last commit date of the drug library, shown on the help page when no entry has a verifiedDate yet. */
function libraryCommitDate(): string {
  try {
    return execSync('git log -1 --format=%cs -- public/drugs.json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// The app build: the app (index.html) and the help page (help.html). The local data editor has its
// own config in tools/editor/ and is never part of dist/.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __LIBRARY_COMMIT_DATE__: JSON.stringify(libraryCommitDate()),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        help: resolve(import.meta.dirname, 'help.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
