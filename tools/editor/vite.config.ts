// Local data editor: `npm run editor`. Never part of the production build or dist/.
// Serves tools/editor/ and a tiny JSON API (bound to 127.0.0.1 only) that reads and writes
// public/drugs.json atomically, with a rolling backup of the previous version.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { serializeLibrary } from '../../src/schema';
import { validateLibrary } from '../../src/validate';
import { buildInitialLibrary, type CandidatesFile } from '../init-lib';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const DRUGS = resolve(root, process.env.CLEARDATE_DRUGS || 'public/drugs.json');
const CANDIDATES = resolve(root, 'tools/candidates.json');
const BACKUPS = resolve(here, '.backups');
const KEEP_BACKUPS = 30;

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

/** Write via temp file + rename, keeping a timestamped backup of the previous file. */
function atomicWrite(text: string) {
  if (existsSync(DRUGS)) {
    mkdirSync(BACKUPS, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(resolve(BACKUPS, `drugs-${stamp}.json`), readFileSync(DRUGS));
    const old = readdirSync(BACKUPS).filter((f) => f.startsWith('drugs-')).sort();
    for (const f of old.slice(0, Math.max(0, old.length - KEEP_BACKUPS))) rmSync(resolve(BACKUPS, f));
  }
  const tmp = `${DRUGS}.tmp-${process.pid}`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, DRUGS);
}

function api(): Plugin {
  return {
    name: 'cleardate-editor-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith('/api/')) return next();
        try {
          if (url === '/api/candidates' && req.method === 'GET') {
            return send(res, 200, JSON.parse(readFileSync(CANDIDATES, 'utf8')));
          }
          if (url === '/api/drugs' && req.method === 'GET') {
            if (!existsSync(DRUGS)) return send(res, 404, { error: 'missing' });
            const text = readFileSync(DRUGS, 'utf8');
            return send(res, 200, { library: JSON.parse(text), hash: hash(text) });
          }
          if (url === '/api/init' && req.method === 'POST') {
            if (existsSync(DRUGS)) return send(res, 409, { error: 'drugs.json already exists' });
            const lib = buildInitialLibrary(JSON.parse(readFileSync(CANDIDATES, 'utf8')) as CandidatesFile);
            const text = serializeLibrary(lib);
            atomicWrite(text);
            return send(res, 200, { library: lib, hash: hash(text) });
          }
          if (url === '/api/drugs' && req.method === 'PUT') {
            const { library, baseHash } = JSON.parse(await readBody(req));
            // Refuse to clobber changes made on disk since the editor loaded the file
            // (another editor tab, a git checkout, or a script).
            if (existsSync(DRUGS)) {
              const current = readFileSync(DRUGS, 'utf8');
              if (hash(current) !== baseHash)
                return send(res, 409, { error: 'drugs.json changed on disk since it was loaded. Reload the editor to pick up those changes (your unsaved edits would be lost), or copy them first.' });
            }
            const v = validateLibrary(library);
            if (v.errors.length) return send(res, 422, { error: 'validation failed', errors: v.errors });
            let text = serializeLibrary(library);
            // Keep the file's existing line endings so git diffs stay clean on any platform.
            if (existsSync(DRUGS) && readFileSync(DRUGS, 'utf8').includes('\r\n')) text = text.replace(/\n/g, '\r\n');
            atomicWrite(text);
            return send(res, 200, { hash: hash(text) });
          }
          send(res, 404, { error: 'unknown endpoint' });
        } catch (e) {
          send(res, 500, { error: (e as Error).message });
        }
      });
    },
  };
}

export default defineConfig({
  root: here,
  plugins: [api()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
    open: !process.env.NO_OPEN,
    fs: { allow: [root] },
  },
  // The editor is a dev-only tool; refuse to build it into anything deployable.
  build: { outDir: resolve(here, '.no-build'), emptyOutDir: true },
});
