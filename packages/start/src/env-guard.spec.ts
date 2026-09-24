/**
 * Refusing a build that would publish a secret.
 *
 * Worth checking because the failure it prevents is silent and complete: Vite inlines every
 * client-prefixed variable into the bundle whether any code reads it or not, so naming one
 * `VITE_API_SECRET` publishes it and nothing in the application looks wrong.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertNoExposedSecrets, findExposedSecrets } from './env-guard.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fx-envguard-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.FLUIXI_ALLOW_PUBLIC_SECRETS;
});

const write = (file: string, body: string) => writeFileSync(join(root, file), body);

describe('a secret named so that it ships', () => {
  it('is found', () => {
    write('.env', 'VITE_CLIENT_SECRET=shh\n');
    expect(findExposedSecrets(root)).toEqual([{ name: 'VITE_CLIENT_SECRET', file: '.env' }]);
  });

  it('is found under any of the words that mean secret', () => {
    write(
      '.env',
      [
        'VITE_APP_SECRET=a',
        'VITE_DB_PASSWORD=b',
        'VITE_SIGNING_PRIVATE_KEY=c',
        'VITE_SERVICE_CREDENTIALS=d',
      ].join('\n'),
    );
    expect(findExposedSecrets(root).map((e) => e.name)).toEqual([
      'VITE_APP_SECRET',
      'VITE_DB_PASSWORD',
      'VITE_SIGNING_PRIVATE_KEY',
      'VITE_SERVICE_CREDENTIALS',
    ]);
  });

  it('is found in every env file an app may carry', () => {
    write('.env', 'VITE_A_SECRET=a\n');
    write('.env.production.local', 'VITE_B_SECRET=b\n');
    expect(findExposedSecrets(root).map((e) => e.file).sort()).toEqual([
      '.env',
      '.env.production.local',
    ]);
  });

  it('fails a build, naming it and the unprefixed form to use', () => {
    write('.env', 'VITE_CLIENT_SECRET=shh\n');
    expect(() => assertNoExposedSecrets(root)).toThrow(/VITE_CLIENT_SECRET/);
    expect(() => assertNoExposedSecrets(root)).toThrow(/CLIENT_SECRET=\.\.\./);
  });
});

describe('what is left alone', () => {
  it('an unprefixed secret, which stays on the server', () => {
    write('.env', 'CLIENT_SECRET=shh\nSESSION_SECRET=also-fine\n');
    expect(findExposedSecrets(root)).toEqual([]);
    expect(() => assertNoExposedSecrets(root)).not.toThrow();
  });

  it('a prefixed value that is genuinely public', () => {
    write('.env', 'VITE_CLIENT_ID=abc\nVITE_OIDC_ISSUER=https://idp.test\n');
    expect(findExposedSecrets(root)).toEqual([]);
  });

  it('a token endpoint, which is a URL and not a token', () => {
    // `TOKEN` is deliberately not one of the words: a list that cries wolf gets ignored.
    write('.env', 'VITE_TOKEN_ENDPOINT=https://idp.test/token\n');
    expect(findExposedSecrets(root)).toEqual([]);
  });

  it('a comment and a blank line', () => {
    write('.env', '# VITE_CLIENT_SECRET=shh\n\n   \nVITE_CLIENT_ID=abc\n');
    expect(findExposedSecrets(root)).toEqual([]);
  });

  it('an app with no env file at all', () => {
    expect(findExposedSecrets(root)).toEqual([]);
  });
});

describe('the escape hatch', () => {
  it('lets a build through for a name that only reads like a secret', () => {
    write('.env', 'VITE_SECRET_SANTA_URL=https://example.test\n');
    expect(() => assertNoExposedSecrets(root)).toThrow();

    process.env.FLUIXI_ALLOW_PUBLIC_SECRETS = 'true';
    expect(() => assertNoExposedSecrets(root)).not.toThrow();
  });
});
