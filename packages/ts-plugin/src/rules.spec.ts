import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

const FRAMEWORK = `
declare module '@fluixi/start/env' {
  export interface PublicEnv { API_URL: string }
  export function env(key: string, options?: { required?: boolean }): string | undefined;
  export function pickEnv<S>(spec: S): any;
  export function serverEnv(key: string, options?: { required?: boolean }): string | undefined;
}
declare module '@fluixi/oauth2' {
  export function createAuthService(options: any): any;
  export function createBrowserClient(options: any): any;
}
declare module '@fluixi/oauth2/verify' {
  export function createTokenVerifier(options: any): any;
  export function createApiGuard(options: any): any;
}
declare module '@fluixi/oauth2/server' {
  export function authServerModule(options: any): any;
}
declare const $env: (key: string) => string | undefined;
declare const process: { env: Record<string, string | undefined> };
interface ImportMeta { env: Record<string, any> }
`;
const CONFIG = `export default {\n  env: {\n    public: [\n      'API_URL',\n    ],\n  },\n};\n`;

function setup(files: Record<string, string>) {
  const all: Record<string, string> = { '/app/framework.d.ts': FRAMEWORK, '/app/fluixi.config.ts': CONFIG, ...files };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(all),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => (all[f] !== undefined ? ts.ScriptSnapshot.fromString(all[f]) : undefined),
    getCurrentDirectory: () => '/app',
    getCompilationSettings: () => ({ target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext, noEmit: true, strict: true, types: [] }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => all[f] !== undefined || ts.sys.fileExists(f),
    readFile: (f) => all[f] ?? ts.sys.readFile(f),
    readDirectory: ts.sys.readDirectory,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const ls = (init as any)({ typescript: ts }).create({ languageService, languageServiceHost: host, project: {}, serverHost: {}, config: {} });
  return { ls: ls as ts.LanguageService, all };
}

/** The plugin's own findings in one file: code and the text they point at. */
function findings(code: string, fileName = '/app/src/routes/page.ts') {
  const { ls } = setup({ [fileName]: code });
  const own = [...ls.getSemanticDiagnostics(fileName), ...ls.getSuggestionDiagnostics(fileName)].filter(
    (d) => d.code >= 9100 && d.code < 9200,
  );
  return own.map((d) => ({ code: d.code, at: code.slice(d.start!, d.start! + d.length!), category: d.category }));
}

describe('env rules', () => {
  it('warns on a non-public name read in browser code, through env, $env and pickEnv', () => {
    const out = findings(
      `import { env, pickEnv } from '@fluixi/start/env';
       export const a = env('API_URL');
       export const b = env('SESSION_SECRET');
       export const c = $env('OIDC_CLIENT_SECRET');
       export const d = pickEnv({ x: 'API_URL', y: { key: 'SESSION_KEY' } });`,
    );
    expect(out.filter((f) => f.code === 9101).map((f) => f.at)).toEqual(["'SESSION_SECRET'", "'OIDC_CLIENT_SECRET'", "'SESSION_KEY'"]);
  });

  it('stays quiet in server files, "use server" bodies and server-only branches', () => {
    const src = `import { env } from '@fluixi/start/env';
      export const a = env('SESSION_SECRET');`;
    expect(findings(src, '/app/src/services/auth.server.ts')).toEqual([]);
    expect(findings(src, '/app/src/api/me.ts')).toEqual([]);
    expect(findings(`export const x = process.env.X;`, '/app/tests/middleware.spec.ts')).toEqual([]);
    expect(
      findings(`import { env } from '@fluixi/start/env';
        export async function save() { 'use server'; return env('SESSION_SECRET'); }
        export const b = import.meta.env.SSR ? env('SESSION_SECRET') : undefined;
        export const c = typeof window === 'undefined' ? env('SESSION_SECRET') : undefined;`),
    ).toEqual([]);
  });

  it('warns on serverEnv and process.env in browser code', () => {
    const out = findings(`import { serverEnv } from '@fluixi/start/env';
      export const a = serverEnv('X');
      export const b = process.env.Y;`);
    expect(out.map((f) => f.code)).toEqual([9102, 9102]);
  });

  it('warns on import.meta.env names Vite never defines in the browser, not on its own', () => {
    const out = findings(`export const a = import.meta.env.API_URL;
      export const b = import.meta.env.VITE_API_URL;
      export const c = import.meta.env.DEV;`);
    expect(out).toEqual([expect.objectContaining({ code: 9103, at: 'import.meta.env.API_URL' })]);
  });

  it('refuses a secret-looking name in env.public, in fluixi.config', () => {
    const out = findings(`export default { env: { public: ['API_URL', 'SESSION_SECRET'] } };`, '/app/fluixi.config.ts');
    expect(out).toEqual([expect.objectContaining({ code: 9104, at: "'SESSION_SECRET'" })]);
  });

  it('adds the name to env.public, in the list layout, and never offers it for a secret', () => {
    const file = '/app/src/routes/page.ts';
    const code = `import { env } from '@fluixi/start/env';\nexport const a = env('APP_URL');\nexport const b = env('SESSION_SECRET');\n`;
    const { ls, all } = setup({ [file]: code });
    const at = (name: string) => code.indexOf(name) + 1;
    const fixes = ls.getCodeFixesAtPosition(file, at('APP_URL'), at('APP_URL') + 7, [9101], {}, {});
    const fix = fixes.find((f) => f.fixName === 'fluixiAddEnvPublic')!;
    expect(fix.description).toBe('Add APP_URL to env.public');
    const [{ fileName, textChanges: [change] }] = fix.changes;
    const config = all[fileName]!;
    const next = config.slice(0, change.span.start) + change.newText + config.slice(change.span.start);
    expect(next).toContain("      'API_URL',\n      'APP_URL',\n    ],");
    const secret = ls.getCodeFixesAtPosition(file, at('SESSION_SECRET'), at('SESSION_SECRET') + 14, [9101], {}, {});
    expect(secret.find((f) => f.fixName === 'fluixiAddEnvPublic')).toBeUndefined();
  });
});

describe('auth rules', () => {
  it('refuses a client secret in a browser client and a secret in browser code', () => {
    const out = findings(`import { createAuthService } from '@fluixi/oauth2';
      import { authServerModule } from '@fluixi/oauth2/server';
      export const a = createAuthService({ config: { tokens: 'browser', clientSecret: 's' } });
      export const b = authServerModule({ clientSecret: 's', cookieSecret: '${'x'.repeat(40)}' });`);
    expect(out.map((f) => [f.code, f.at])).toEqual([[9105, 'clientSecret'], [9105, 'clientSecret']]);
  });

  it('allows a secret in a server file', () => {
    const out = findings(`import { authServerModule } from '@fluixi/oauth2/server';
      export const b = authServerModule({ clientSecret: 's', cookieSecret: '${'x'.repeat(40)}' });`, '/app/src/services/auth.server.ts');
    expect(out).toEqual([]);
  });

  it('flags an unchecked audience and weak algorithms, and accepts authorizedParty', () => {
    const out = findings(`import { createTokenVerifier } from '@fluixi/oauth2/verify';
      export const a = createTokenVerifier({ issuer: 'i', audience: false, algorithms: ['RS256', 'HS256', 'none'] });
      export const b = createTokenVerifier({ issuer: 'i', audience: false, authorizedParty: 'app' });`, '/app/src/api/x.ts');
    expect(out.map((f) => [f.code, f.at])).toEqual([[9106, 'audience: false'], [9107, "'HS256'"], [9107, "'none'"]]);
  });

  it('refuses a bare token to a DPoP verifier and a role on a guard without roles', () => {
    const out = findings(`import { createTokenVerifier, createApiGuard } from '@fluixi/oauth2/verify';
      export const check = (t: string) => verify(t);
      const verify = createTokenVerifier({ issuer: 'i', audience: 'a', dpop: true });
      export const ok = verify.fromRequest;
      const guard = createApiGuard({ verify });
      export const DELETE = guard(async () => new Response(), { role: 'admin' });
      const withRoles = createApiGuard({ verify, roles: () => [] });
      export const PUT = withRoles(async () => new Response(), { role: 'admin' });`, '/app/src/api/x.ts');
    expect(out.map((f) => [f.code, f.at])).toEqual([[9108, 'verify'], [9109, 'role']]);
  });

  it('flags a short cookie key, a cookie over plain http, and notes local storage', () => {
    const out = findings(`import { authServerModule } from '@fluixi/oauth2/server';
      import { createBrowserClient } from '@fluixi/oauth2';
      export const a = authServerModule({ cookieSecret: 'short', secureCookie: false });
      export const b = createBrowserClient({ storage: 'local' });`, '/app/src/services/auth.server.ts');
    expect(out.map((f) => [f.code, f.at, ts.DiagnosticCategory[f.category]])).toEqual([
      [9110, "'short'", 'Error'],
      [9110, 'secureCookie: false', 'Warning'],
      [9111, "'local'", 'Suggestion'],
    ]);
  });

  it('ignores lookalikes that are not the framework functions', () => {
    const out = findings(`const createTokenVerifier = (o: any) => o;
      export const a = createTokenVerifier({ audience: false, algorithms: ['none'] });
      export const form = { clientSecret: '' };`);
    expect(out).toEqual([]);
  });
});
