/**
 * Serving files from disk, and the two ways it goes wrong.
 *
 * The traversal cases are the reason this file exists. A URL's pathname keeps percent
 * encoding, so a check written against the request text passes while the path that gets
 * opened points somewhere else entirely. Each one below served a real file above the static
 * root before the containment check went in.
 *
 * The rest pin the fall-through: a request with an extension that no file answers has to
 * reach the renderer when it could be a route, and must not when it is build output.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withStaticFiles } from './handler.js';

let root: string;
let client: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-static-'));
  client = join(root, 'dist', 'client');
  mkdirSync(join(client, 'assets'), { recursive: true });

  writeFileSync(join(client, 'assets', 'index-abc123.js'), 'console.log(1)');
  writeFileSync(join(client, 'favicon.ico'), 'icon');
  // Above the served directory, which is the whole point of the traversal cases.
  writeFileSync(join(root, '.env'), 'COOKIE_SECRET=shh');
  writeFileSync(join(root, 'package.json'), '{"name":"app"}');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** A handler standing in for the renderer, so a fall-through is visible. */
const rendered = () => new Response('<!doctype html><title>app</title>', {
  headers: { 'content-type': 'text/html; charset=utf-8' },
});

const serve = (options?: { assetDir?: string }) =>
  withStaticFiles(async () => rendered(), client, options);

const get = (path: string) =>
  serve()(new Request(`http://app.test${path}`));

describe('a file that is there', () => {
  it('is served with its media type', async () => {
    const response = await get('/assets/index-abc123.js');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript');
    expect(await response.text()).toBe('console.log(1)');
  });

  it('is served from the root of the directory too', async () => {
    const response = await get('/favicon.ico');
    expect(response.headers.get('content-type')).toBe('image/x-icon');
  });
});

describe('a path pointing outside the served directory', () => {
  /**
   * Only an encoded separator gets this far. The URL parser resolves `..` between real
   * slashes and treats `%2e` as a dot while doing it, so `/assets/%2e%2e/%2e%2e/.env`
   * arrives already collapsed to `/.env` and never described a path above the root. What it
   * does not touch is `%2f`, so these keep their traversal until something decodes them,
   * which is where the bug was.
   */
  const escapes = [
    ['encoded dot-dot and encoded slashes', '/assets/%2e%2e%2f%2e%2e%2f.env'],
    ['encoded slashes around plain dot-dot', '/assets%2f..%2f..%2f.env'],
    ['a deeper path climbing out', '/a/b/%2e%2e%2f%2e%2e%2f%2e%2e%2fpackage.json'],
    ['upper case encoding', '/assets/%2E%2E%2F%2E%2E%2F.env'],
  ] as const;

  for (const [name, path] of escapes) {
    it(`is refused: ${name}`, async () => {
      const response = await get(path);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toMatch(/COOKIE_SECRET|"name":"app"/);
    });
  }

  it('is refused rather than told apart from an absent file', async () => {
    // Same answer either way, so probing cannot map what is up there.
    const outside = await get('/assets/%2e%2e%2f%2e%2e%2f.env');
    const absent = await get('/assets/nothing-here.js');
    expect(outside.status).toBe(absent.status);
  });

  it('refuses malformed encoding instead of throwing', async () => {
    const response = await get('/assets/%zz.js');
    expect(response.status).toBe(404);
  });
});

describe('an encoding the URL parser already dealt with', () => {
  /**
   * These never reached outside, and the check must not start reading them as if they did:
   * the first is a normal path by the time it arrives, the second a filename that merely
   * looks like traversal.
   */
  it('leaks nothing when real slashes were collapsed before arrival', async () => {
    const response = await get('/assets/%2e%2e/%2e%2e/.env');
    expect(await response.text()).not.toContain('COOKIE_SECRET');
  });

  it('treats a double-encoded sequence as the filename it is', async () => {
    // Decodes once to the literal name `%2e%2e%2f.env`, which is not a traversal.
    const response = await get('/assets/%252e%252e%252f.env');
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('COOKIE_SECRET');
  });
});

describe('a path that stays inside', () => {
  it('is served even when it takes a detour through a parent', async () => {
    // Resolves back to /assets/index-abc123.js, so it is legitimate.
    const response = await get('/assets/sub/%2e%2e/index-abc123.js');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('console.log(1)');
  });
});

describe('when no file answers', () => {
  it('hands a route-shaped path to the renderer', async () => {
    // An app may generate this, so the static layer must not claim it.
    const response = await get('/sitemap.xml');
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('hands the document root to the renderer', async () => {
    const response = await get('/');
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('refuses a miss under the asset directory rather than rendering', async () => {
    const response = await get('/assets/index-stale99.js');

    // Falling through here makes a browser report a MIME type for what is a missing file,
    // which hides the cause.
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/plain');
  });

  it('says why a bundle is missing', async () => {
    const body = await (await get('/assets/index-stale99.js')).text();
    expect(body).toMatch(/rebuild/i);
  });

  it('applies the asset rule to a configured directory', async () => {
    const response = await serve({ assetDir: 'static' })(
      new Request('http://app.test/static/index-stale99.js'),
    );
    expect(response.status).toBe(404);

    // And no longer to the default one, which is now an ordinary path.
    const fellThrough = await serve({ assetDir: 'static' })(
      new Request('http://app.test/assets/index-stale99.js'),
    );
    expect(fellThrough.headers.get('content-type')).toContain('text/html');
  });
});
