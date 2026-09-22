/**
 * The build refusing an app whose API routes would never be reached.
 *
 * Worth a test because the failure it prevents is silent: a built server with no
 * re-export answers `/api/anything` with a rendered page and a 200, so a route written to
 * refuse a request appears to accept it. Nothing at runtime says otherwise.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertApiRoutesReachable } from './api.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-api-'));
  mkdirSync(join(root, 'src'), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const check = () =>
  assertApiRoutesReachable({ root, apiDir: 'src/api', serverEntry: 'src/entry-server.ts' });

const writeEntry = (body: string) => writeFileSync(join(root, 'src/entry-server.ts'), body);

const writeRoute = (name = 'me.ts') => {
  mkdirSync(join(root, 'src/api'), { recursive: true });
  writeFileSync(join(root, 'src/api', name), 'export const GET = () => new Response("ok");');
};

describe('an app with API routes', () => {
  it('is refused when the entry does not re-export the handlers', () => {
    writeRoute();
    writeEntry('export function render() {}');
    expect(check).toThrow(/does not re-export them/);
  });

  it('is told which line to add', () => {
    writeRoute();
    writeEntry('export function render() {}');
    // The message has to be actionable: the failure gives no other clue what is wrong.
    expect(check).toThrow(/@fluixi\/start\/api-routes/);
  });

  it('passes once the entry re-exports them', () => {
    writeRoute();
    writeEntry(`export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';`);
    expect(check).not.toThrow();
  });

  it('finds a route nested in a folder', () => {
    mkdirSync(join(root, 'src/api/admin'), { recursive: true });
    writeFileSync(join(root, 'src/api/admin/users.ts'), 'export const GET = () => {};');
    writeEntry('export function render() {}');
    expect(check).toThrow(/does not re-export them/);
  });
});

describe('an app with no API routes', () => {
  it('is left alone when the folder does not exist', () => {
    writeEntry('export function render() {}');
    expect(check).not.toThrow();
  });

  it('is left alone when the folder is empty', () => {
    mkdirSync(join(root, 'src/api'), { recursive: true });
    writeEntry('export function render() {}');
    expect(check).not.toThrow();
  });

  it('does not count a test file as a route', () => {
    writeRoute('me.spec.ts');
    writeEntry('export function render() {}');
    expect(check).not.toThrow();
  });
});

describe('when there is no server entry to read', () => {
  it('says nothing, because that is a different problem reported elsewhere', () => {
    writeRoute();
    expect(check).not.toThrow();
  });
});
