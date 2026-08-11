/**
 * Check what a deploy adapter actually produced.
 *
 *   node scripts/verify-adapters.mjs                    # every adapter, against examples/start-app
 *   node scripts/verify-adapters.mjs cloudflare
 *   node scripts/verify-adapters.mjs --url http://localhost:8788   # a running emulator or a preview
 *
 * Two things are checked, and they fail differently.
 *
 * The request matrix is the behaviour: the same requests every deploy has to answer,
 * run either against the emitted artifact in-process or against a URL. In-process
 * proves the handler assembles and renders without a filesystem. It does not prove the
 * platform routes to it — for that, point `--url` at `wrangler pages dev`,
 * `netlify serve` or `vercel dev`, where the platform's own routing is in play.
 *
 * The portability scan is the runtime: a bundle that imports `node:fs` runs fine here
 * and throws on workerd. Node is the permissive runtime, so passing locally means
 * nothing without this.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP = resolve(import.meta.dirname, '../examples/start-app');

/** Where each adapter leaves the thing that answers a request. */
const ADAPTERS = {
  cloudflare: {
    artifact: 'dist/client/_worker.js',
    invoke: (mod, request) => mod.default.fetch(request, {}, {}),
    // Files that must not be in the published directory, because they are the server.
    publishedDir: 'dist/client',
  },
  netlify: {
    artifact: '.netlify/functions-internal/fluixi-server.mjs',
    invoke: (mod, request) => mod.default(request, {}),
    publishedDir: 'dist/client',
  },
  vercel: {
    artifact: '.vercel/output/functions/index.func/index.mjs',
    invoke: (mod, request) => mod.default(request),
    publishedDir: '.vercel/output/static',
  },
};

/** Every deploy has to answer these the same way. */
const MATRIX = [
  { path: '/', expect: (s, body) => s === 200 && /<div id="root">/.test(body), name: 'renders the shell' },
  { path: '/about', expect: (s, body) => s === 200 && body.includes('About'), name: 'renders a route' },
  { path: '/api/hello', expect: (s, body) => s === 200 && body.includes('hello'), name: 'answers an API route' },
  { path: '/nope-does-not-exist', expect: (s) => s === 200 || s === 404, name: 'handles an unknown path' },
];

/**
 * Node APIs the Workers runtime does not have.
 *
 * Only imports fail the run. An import is resolved before any code executes, so it
 * breaks the deploy outright; a global read may well be a feature probe
 * (`typeof process !== 'undefined' && …`), and telling those apart by pattern is
 * guesswork — an earlier version of this flagged every guarded probe and would have
 * been ignored within a week. Probes are reported, not failed, and the runtime
 * question is settled by `--url` against an emulator rather than by reading strings.
 */
function scanPortability(file) {
  const code = readFileSync(file, 'utf-8');
  const fatal = [];
  for (const m of code.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'](node:[a-z_/]+)["']/g)) {
    fatal.push(`imports ${m[1]}`);
  }
  for (const m of code.matchAll(/(?:from\s*|require\s*\(\s*)["'](fs|path|http|https|stream|async_hooks|child_process|os)["']/g)) {
    fatal.push(`imports bare "${m[1]}"`);
  }
  const probes = new Set();
  for (const m of code.matchAll(/\b(process|Buffer|__dirname)\b/g)) probes.add(m[1]);
  return { fatal: [...new Set(fatal)], probes: [...probes] };
}

async function run(name, { url }) {
  const spec = ADAPTERS[name];
  const results = [];

  if (!url) {
    writeFileSync(
      join(APP, 'fluixi.config.ts'),
      `import { defineConfig } from '@fluixi/start/config';\n` +
        `import { ${name}Adapter } from '@fluixi/start/adapter';\n` +
        `export default defineConfig({ port: 3100, adapter: ${name}Adapter });\n`,
    );
    rmSync(join(APP, 'dist'), { recursive: true, force: true });
    execFileSync('pnpm', ['build'], { cwd: APP, stdio: 'pipe' });
  }

  const artifact = join(APP, spec.artifact);
  if (!url) {
    // The commonest way to get a directory of 404s is to serve a build made for a
    // different target, so say which one this is before running anything against it.
    if (!existsSync(artifact)) return [{ name: 'emits its artifact', ok: false, detail: spec.artifact }];
    results.push({ name: 'emits its artifact', ok: true });

    const { fatal, probes } = scanPortability(artifact);
    results.push({
      name: 'bundle imports no Node builtin',
      ok: fatal.length === 0,
      detail: fatal.join('; ') || (probes.length ? `probes for ${probes.join(', ')} (guarded — verify with --url)` : ''),
    });

    // The server must not be sitting in the directory the CDN publishes.
    const published = join(APP, spec.publishedDir);
    const leaked = existsSync(published)
      ? execFileSync('find', [published, '-name', '*.js'], { encoding: 'utf-8' })
          .split('\n')
          .filter((f) => f && f !== artifact && /handleServerFn|registerServerFn/.test(readFileSync(f, 'utf-8')))
      : [];
    results.push({
      name: 'no server code in the published directory',
      ok: leaked.length === 0,
      detail: leaked.map((f) => f.replace(APP + '/', '')).join(', '),
    });
  }

  const mod = url ? null : await import(artifact);
  for (const c of MATRIX) {
    try {
      const request = new Request(`http://local.test${c.path}`);
      const res = url ? await fetch(url.replace(/\/$/, '') + c.path) : await spec.invoke(mod, request);
      const body = await res.text();
      results.push({ name: c.name, ok: c.expect(res.status, body), detail: `status ${res.status}` });
    } catch (e) {
      results.push({ name: c.name, ok: false, detail: String(e.message).slice(0, 80) });
    }
  }
  return results;
}

const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const url = urlIndex === -1 ? null : args[urlIndex + 1];
const names = args.filter((a) => a in ADAPTERS);
// With --url there is one server behind the URL, so running every adapter against it
// just repeats the same requests three times and reports three identical failures.
if (url && names.length !== 1) {
  console.error(
    'Pass the adapter the URL is serving, e.g.\n' +
      '  node scripts/verify-adapters.mjs cloudflare --url http://localhost:8788',
  );
  process.exit(2);
}
const targets = names.length ? names : Object.keys(ADAPTERS);

let failed = 0;
for (const name of targets) {
  console.log(`\n${name}${url ? `  (against ${url})` : ''}`);
  for (const r of await run(name, { url })) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail && (!r.ok || process.env.VERBOSE) ? `  — ${r.detail}` : ''}`);
  }
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
