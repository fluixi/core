/**
 * Env and auth mistakes, reported while the code is written.
 *
 * The build already refuses a secret read in browser code; this says so at the keystroke, next
 * to the line, with the same words. The auth rules catch configurations that work in a demo and
 * fail in a way nobody notices: a verifier that accepts tokens minted for another client, a
 * secret in a browser bundle, a cookie key short enough to guess.
 *
 * Calls are recognised through their imports, so only the framework's own functions are judged:
 * an admin form with a `clientSecret` field of its own is none of this module's business.
 *
 * "Browser code" is a guess here, since the editor sees one file and not the import graph: every
 * file except a `.server` file, an API route, middleware, `app.config.server.ts` and the config
 * files, minus a `"use server"` body and a branch only the server takes. Rules resting on that
 * guess are warnings; the build is the authority.
 */
import type * as TS from 'typescript';

export const RULE = {
  envNotPublic: 9101,
  serverReadInBrowser: 9102,
  importMetaEnv: 9103,
  secretInEnvPublic: 9104,
  secretInBrowser: 9105,
  audienceUnchecked: 9106,
  weakAlgorithm: 9107,
  dpopBareVerify: 9108,
  guardWithoutRoles: 9109,
  weakCookie: 9110,
  localStorageTokens: 9111,
} as const;

const SECRETISH = /(SECRET|PASSWORD|PASSWD|PRIVATE_KEY|CLIENT_SECRET|CREDENTIALS?)($|_)/;
const VITE_BUILTINS = new Set(['DEV', 'PROD', 'SSR', 'MODE', 'BASE_URL']);

/** Files that never run in a browser: server code, build-time config and tests. */
export function isServerFile(fileName: string): boolean {
  const f = fileName.replace(/\\/g, '/');
  return (
    /\.server\.[cm]?[jt]sx?$/.test(f) ||
    /\/src\/api\//.test(f) ||
    /\/src\/middleware\.[cm]?[jt]s$/.test(f) ||
    /\/(fluixi|vite)\.config\.[cm]?[jt]s$/.test(f) ||
    /\/src\/entry-server\.[cm]?[jt]sx?$/.test(f) ||
    // Tests run under Node, never in a page.
    /\.(spec|test)\.[cm]?[jt]sx?$/.test(f) ||
    /\/(tests?|__tests__)\//.test(f)
  );
}

interface Imported {
  module: string;
  name: string;
}

function importsOf(ts: typeof TS, sf: TS.SourceFile): Map<string, Imported> {
  const out = new Map<string, Imported>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const el of bindings.elements) {
      out.set(el.name.text, { module: stmt.moduleSpecifier.text, name: (el.propertyName ?? el.name).text });
    }
  }
  return out;
}

/** A test the build treats as true only on one side. */
function sideOf(ts: typeof TS, test: TS.Expression): 'server' | 'browser' | null {
  if (ts.isParenthesizedExpression(test)) return sideOf(ts, test.expression);
  if (ts.isPrefixUnaryExpression(test) && test.operator === ts.SyntaxKind.ExclamationToken) {
    const inner = sideOf(ts, test.operand);
    return inner === 'server' ? 'browser' : inner === 'browser' ? 'server' : null;
  }
  if (
    ts.isPropertyAccessExpression(test) &&
    test.name.text === 'SSR' &&
    ts.isPropertyAccessExpression(test.expression) &&
    test.expression.name.text === 'env' &&
    ts.isMetaProperty(test.expression.expression)
  ) {
    return 'server';
  }
  if (ts.isBinaryExpression(test)) {
    const op = test.operatorToken.kind;
    const eq = op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken;
    const ne = op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken;
    if (!eq && !ne) return null;
    const typeofGlobal = (n: TS.Expression) =>
      ts.isTypeOfExpression(n) && ts.isIdentifier(n.expression) && ['window', 'document'].includes(n.expression.text);
    const undef = (n: TS.Expression) => ts.isStringLiteral(n) && n.text === 'undefined';
    if ((typeofGlobal(test.left) && undef(test.right)) || (typeofGlobal(test.right) && undef(test.left))) {
      return eq ? 'server' : 'browser';
    }
  }
  return null;
}

const isUseServer = (ts: typeof TS, body: TS.Node | undefined): boolean => {
  if (!body || !ts.isBlock(body)) return false;
  const first = body.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use server';
};

/** Whether this node only ever runs on the server: a `"use server"` body or a server-only branch. */
function inServerContext(ts: typeof TS, node: TS.Node, sf: TS.SourceFile): boolean {
  const first = sf.statements[0];
  if (first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use server') {
    return true;
  }
  for (let child: TS.Node = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
    if ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) && isUseServer(ts, parent.body)) {
      return true;
    }
    if (ts.isIfStatement(parent) || ts.isConditionalExpression(parent)) {
      const side = sideOf(ts, parent.condition);
      const whenTrue = ts.isIfStatement(parent) ? parent.thenStatement : parent.whenTrue;
      const whenFalse = ts.isIfStatement(parent) ? parent.elseStatement : parent.whenFalse;
      if (side === 'server' && child === whenTrue) return true;
      if (side === 'browser' && child === whenFalse) return true;
    }
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      child === parent.right &&
      sideOf(ts, parent.left) === 'server'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The names `env.public` declares, as the type checker sees them: the generated
 * `src/fluixi-env-vars.d.ts` fills `PublicEnv` in. Null when the app declares none, which turns
 * the env-name rule off, as the build does.
 */
export function publicEnvNames(
  ts: typeof TS,
  program: TS.Program,
  fileName: string,
  host: TS.ModuleResolutionHost | undefined,
): Set<string> | null {
  const checker = program.getTypeChecker();
  let moduleSymbol: TS.Symbol | undefined;
  if (host) {
    const resolved = ts.resolveModuleName('@fluixi/start/env', fileName, program.getCompilerOptions(), host).resolvedModule;
    const target = resolved && program.getSourceFile(resolved.resolvedFileName);
    if (target) moduleSymbol = checker.getSymbolAtLocation(target);
  }
  moduleSymbol ??= checker.getAmbientModules().find((m) => m.name.replace(/"/g, '') === '@fluixi/start/env');
  const iface = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((s) => s.name === 'PublicEnv');
  if (!iface) return null;
  const names = checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(iface)).map((p) => p.name);
  return names.length ? new Set(names) : null;
}

type Found = Omit<TS.Diagnostic, 'file'> & { start: number; length: number };

const propsOf = (ts: typeof TS, obj: TS.ObjectLiteralExpression) => {
  const map = new Map<string, TS.PropertyAssignment>();
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) map.set(p.name.text, p);
  }
  return map;
};
const isFalse = (ts: typeof TS, e: TS.Expression | undefined) => !!e && e.kind === ts.SyntaxKind.FalseKeyword;

const OAUTH_CONFIG_CALLS = new Set([
  'createAuthService',
  'createBrowserClient',
  'createServerClient',
  'createServiceClient',
  'createTokenIntrospector',
  'oauthRoutes',
  'authServerModule',
  'sessionLocals',
]);

/** Every env and auth finding in one file. */
export function envAuthDiagnostics(
  ts: typeof TS,
  program: TS.Program,
  fileName: string,
  host?: TS.ModuleResolutionHost,
): TS.Diagnostic[] {
  const sf = program.getSourceFile(fileName);
  if (!sf || sf.isDeclarationFile || /[\\/]node_modules[\\/]/.test(fileName)) return [];
  const text = sf.text;
  const isConfig = /[\\/]fluixi\.config\.[cm]?[jt]s$/.test(fileName);
  if (!isConfig && !/fluixi|\$env|import\.meta\.env|process\.env/.test(text)) return [];

  const out: Found[] = [];
  const add = (node: TS.Node, code: number, category: TS.DiagnosticCategory, messageText: string) =>
    out.push({ start: node.getStart(sf), length: node.getWidth(sf), code, category, messageText, source: 'fluixi' });

  const imports = importsOf(ts, sf);
  const serverFile = isServerFile(fileName);
  const browserSide = (node: TS.Node) => !serverFile && !inServerContext(ts, node, sf);
  const fromModule = (callee: TS.Expression, prefix: string): string | null => {
    if (!ts.isIdentifier(callee)) return null;
    const hit = imports.get(callee.text);
    return hit && (hit.module === prefix || hit.module.startsWith(prefix + '/')) ? hit.name : null;
  };

  let publicNames: Set<string> | null | undefined;
  const isPublic = (key: string) => {
    if (publicNames === undefined) publicNames = publicEnvNames(ts, program, fileName, host);
    return publicNames === null || publicNames.has(key) || key.startsWith('VITE_');
  };
  const envNotPublic = (lit: TS.StringLiteral) => {
    if (!browserSide(lit) || isPublic(lit.text)) return;
    add(
      lit,
      RULE.envNotPublic,
      ts.DiagnosticCategory.Warning,
      `${lit.text} is not in env.public, so the browser has no value for it, and the build refuses this read in browser code. ` +
        `If it is public, add it to env.public in fluixi.config.ts. If it is a secret, read it on the server and pass the page what it needs.`,
    );
  };

  // Verifiers built with DPoP and guards built without roles, by local name.
  const dpopVerifiers = new Set<string>();
  const guardsWithoutRoles = new Set<string>();

  const visit = (node: TS.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const envFn = ts.isIdentifier(callee) && callee.text === '$env' ? 'env' : fromModule(callee, '@fluixi/start');
      const oauthFn = fromModule(callee, '@fluixi/oauth2');
      const sessionFn = fromModule(callee, '@fluixi/session');
      const arg0 = node.arguments[0];

      // 1. A read of a name the browser does not have.
      if (envFn === 'env' && arg0 && ts.isStringLiteral(arg0)) envNotPublic(arg0);
      if (envFn === 'pickEnv' && arg0 && ts.isObjectLiteralExpression(arg0)) {
        for (const p of arg0.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          if (ts.isStringLiteral(p.initializer)) envNotPublic(p.initializer);
          else if (ts.isObjectLiteralExpression(p.initializer)) {
            const key = propsOf(ts, p.initializer).get('key')?.initializer;
            if (key && ts.isStringLiteral(key)) envNotPublic(key);
          }
        }
      }

      // 2. A server-only reader in browser code.
      if (envFn === 'serverEnv' && browserSide(node)) {
        add(callee, RULE.serverReadInBrowser, ts.DiagnosticCategory.Warning,
          'serverEnv() in code the browser runs throws there: server-only values are not in the bundle. Read it in an API route, middleware or a "use server" function.');
      }

      // 8. A DPoP verifier given a bare token cannot check the proof.
      if (ts.isIdentifier(callee) && dpopVerifiers.has(callee.text)) {
        add(callee, RULE.dpopBareVerify, ts.DiagnosticCategory.Error,
          `${callee.text} requires DPoP, and a bare token carries no proof, so every call is refused. Use ${callee.text}.fromRequest(request).`);
      }

      // 9. A role requirement on a guard that cannot read roles.
      if (ts.isIdentifier(callee) && guardsWithoutRoles.has(callee.text)) {
        const req = node.arguments[1];
        if (req && ts.isObjectLiteralExpression(req)) {
          const props = propsOf(ts, req);
          const role = props.get('role') ?? props.get('allRoles');
          if (role) {
            add(role.name, RULE.guardWithoutRoles, ts.DiagnosticCategory.Error,
              `${callee.text} was built without \`roles\`, so a role requirement throws on the first request. Pass one of rolesFrom to createApiGuard.`);
          }
        }
      }

      // Options objects of the framework's own auth calls.
      const configs: TS.ObjectLiteralExpression[] = [];
      if ((oauthFn && OAUTH_CONFIG_CALLS.has(oauthFn)) || oauthFn === 'createTokenVerifier' || sessionFn === 'createSessionCookie') {
        if (arg0 && ts.isObjectLiteralExpression(arg0)) {
          configs.push(arg0);
          const nested = propsOf(ts, arg0).get('config')?.initializer;
          if (oauthFn === 'createAuthService' && nested && ts.isObjectLiteralExpression(nested)) configs.push(nested);
        }
      }

      for (const obj of configs) {
        const props = propsOf(ts, obj);
        const tokens = props.get('tokens')?.initializer;
        const browserTokens =
          (tokens && ts.isStringLiteral(tokens) && tokens.text === 'browser') || oauthFn === 'createBrowserClient';

        // 5. A secret handed to something the browser holds.
        for (const secret of ['clientSecret', 'privateKey']) {
          const p = props.get(secret);
          if (p && (browserTokens || (browserSide(p) && oauthFn !== 'createTokenVerifier'))) {
            add(p.name, RULE.secretInBrowser, ts.DiagnosticCategory.Error,
              `${secret} in ${browserTokens ? "a tokens: 'browser' client" : 'code the browser runs'} ships to every visitor, and anything shipped to a browser is not a secret. ` +
                `A browser client uses PKCE without one; keep ${secret} on the server.`);
          }
        }

        if (oauthFn === 'createTokenVerifier') {
          // 6. No audience check and nothing in its place.
          const audience = props.get('audience');
          if (audience && isFalse(ts, audience.initializer) && !props.has('authorizedParty') && !props.has('require')) {
            add(audience, RULE.audienceUnchecked, ts.DiagnosticCategory.Warning,
              'audience: false with no authorizedParty or require accepts a token minted for any client of the same issuer. ' +
                'Pin authorizedParty to your client id, or check a claim in require.');
          }
          // 7. Algorithms a verifier must not accept.
          const algs = props.get('algorithms')?.initializer;
          if (algs && ts.isArrayLiteralExpression(algs)) {
            for (const el of algs.elements) {
              if (ts.isStringLiteral(el) && (/^HS/.test(el.text) || el.text === 'none')) {
                add(el, RULE.weakAlgorithm, ts.DiagnosticCategory.Error,
                  el.text === 'none'
                    ? '"none" accepts an unsigned token as valid.'
                    : `${el.text} verifies with a shared secret; with a provider's public key it lets anyone who has that key sign tokens. Use RS256 or ES256.`);
              }
            }
          }
        }

        // 10. A cookie key short enough to guess, or a cookie sent over plain http.
        const cookieKey = props.get(sessionFn === 'createSessionCookie' ? 'secret' : 'cookieSecret');
        if (cookieKey && ts.isStringLiteral(cookieKey.initializer) && cookieKey.initializer.text.length < 32) {
          add(cookieKey.initializer, RULE.weakCookie, ts.DiagnosticCategory.Error,
            'The session cookie is encrypted with a key derived from this, and under 32 characters it is short enough to guess. Read a long random value with serverEnv.');
        }
        const secure = props.get(sessionFn === 'createSessionCookie' ? 'secure' : 'secureCookie');
        if (secure && isFalse(ts, secure.initializer)) {
          add(secure, RULE.weakCookie, ts.DiagnosticCategory.Warning,
            'The session cookie will also be sent over plain http. Keep this for local work only: derive it, e.g. from whether the app URL is https.');
        }

        // 11. Refresh tokens that outlive the tab.
        const storage = props.get('storage')?.initializer;
        if (storage && ts.isStringLiteral(storage) && storage.text === 'local' && browserTokens) {
          add(storage, RULE.localStorageTokens, ts.DiagnosticCategory.Suggestion,
            "storage: 'local' keeps the refresh token after the tab closes, so injected script can reach it for longer. 'session', the default, ends with the tab.");
        }
      }
    }

    // 2 and 3. process.env in browser code, and import.meta.env names Vite never defines there.
    if (ts.isPropertyAccessExpression(node)) {
      const obj = node.expression;
      if (ts.isIdentifier(obj) && obj.text === 'process' && node.name.text === 'env' && browserSide(node)) {
        add(node, RULE.serverReadInBrowser, ts.DiagnosticCategory.Warning,
          'process.env does not exist in the browser. Use $env(\'NAME\'), which reads the public set there and anything on the server.');
      }
      if (
        ts.isPropertyAccessExpression(obj) &&
        obj.name.text === 'env' &&
        ts.isMetaProperty(obj.expression) &&
        !VITE_BUILTINS.has(node.name.text) &&
        !node.name.text.startsWith('VITE_')
      ) {
        add(node, RULE.importMetaEnv, ts.DiagnosticCategory.Warning,
          `import.meta.env.${node.name.text} is undefined in the browser: Vite only defines VITE_ names there. Use $env('${node.name.text}') and declare it in env.public if it is public.`);
      }
    }

    // 4. A secret listed as public, in fluixi.config.
    if (
      /[\\/]fluixi\.config\.[cm]?[jt]s$/.test(fileName) &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'public' &&
      ts.isArrayLiteralExpression(node.initializer) &&
      ts.isObjectLiteralExpression(node.parent) &&
      ts.isPropertyAssignment(node.parent.parent) &&
      ts.isIdentifier(node.parent.parent.name) &&
      node.parent.parent.name.text === 'env'
    ) {
      for (const el of node.initializer.elements) {
        if (ts.isStringLiteral(el) && SECRETISH.test(el.text)) {
          add(el, RULE.secretInEnvPublic, ts.DiagnosticCategory.Error,
            `${el.text} reads like a secret, and env.public puts its value in the browser bundle; the build refuses it. ` +
              'Remove it and read it with serverEnv() on the server. If the name only looks like a secret, set FLUIXI_ALLOW_PUBLIC_SECRETS=true.');
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  // Two passes, so a verifier or guard declared below its use is still known.
  const collect = (node: TS.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer)) {
      const fn = fromModule(node.initializer.expression, '@fluixi/oauth2');
      const opts = node.initializer.arguments[0];
      if (opts && ts.isObjectLiteralExpression(opts)) {
        const props = propsOf(ts, opts);
        if (fn === 'createTokenVerifier' && props.get('dpop')?.initializer.kind === ts.SyntaxKind.TrueKeyword) dpopVerifiers.add(node.name.text);
        if (fn === 'createApiGuard' && !props.has('roles') && !opts.properties.some((p) => ts.isSpreadAssignment(p))) {
          guardsWithoutRoles.add(node.name.text);
        }
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);
  visit(sf);

  return out.map((d) => ({ ...d, file: sf }));
}

const CONFIG_NAMES = ['fluixi.config.ts', 'fluixi.config.mts', 'fluixi.config.js', 'fluixi.config.mjs'];

/** The nearest `fluixi.config.*` above a file. */
function findConfig(fileName: string, host: TS.ModuleResolutionHost): string | null {
  let dir = fileName.replace(/\\/g, '/').replace(/\/[^/]*$/, '');
  for (;;) {
    for (const name of CONFIG_NAMES) if (host.fileExists(`${dir}/${name}`)) return `${dir}/${name}`;
    const up = dir.replace(/\/[^/]*$/, '');
    if (!up || up === dir) return null;
    dir = up;
  }
}

/**
 * "Add NAME to env.public": the quick fix for an env read the browser cannot satisfy.
 *
 * Edits `fluixi.config.*` in place, after the last entry, in the list's own layout. Offered only
 * when that list exists, since creating an `env` block would be a decision about the whole app,
 * and never for a name that reads like a secret: publishing it is exactly the mistake to avoid.
 */
export function envPublicFix(
  ts: typeof TS,
  program: TS.Program,
  fileName: string,
  position: number,
  host: TS.ModuleResolutionHost,
): TS.CodeFixAction | null {
  const sf = program.getSourceFile(fileName);
  if (!sf) return null;
  let literal: TS.StringLiteral | undefined;
  const find = (node: TS.Node): void => {
    if (literal || position < node.getFullStart() || position > node.getEnd()) return;
    if (ts.isStringLiteral(node) && position >= node.getStart(sf) && position <= node.getEnd()) literal = node;
    else ts.forEachChild(node, find);
  };
  find(sf);
  if (!literal || SECRETISH.test(literal.text)) return null;

  const configPath = findConfig(fileName, host);
  const configText = configPath && host.readFile(configPath);
  if (!configPath || !configText) return null;
  const config = ts.createSourceFile(configPath, configText, ts.ScriptTarget.Latest, true);

  let list: TS.ArrayLiteralExpression | undefined;
  const search = (node: TS.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'public' &&
      ts.isArrayLiteralExpression(node.initializer) &&
      ts.isPropertyAssignment(node.parent.parent) &&
      ts.isIdentifier(node.parent.parent.name) &&
      node.parent.parent.name.text === 'env'
    ) {
      list = node.initializer;
    }
    if (!list) ts.forEachChild(node, search);
  };
  search(config);
  if (!list) return null;

  const quote = list.elements.find(ts.isStringLiteral)?.getText(config).startsWith('"') ? '"' : "'";
  const entry = `${quote}${literal.text}${quote}`;
  const last = list.elements[list.elements.length - 1];
  let change: TS.TextChange;
  if (!last) {
    change = { span: { start: list.getStart(config) + 1, length: 0 }, newText: entry };
  } else {
    const multiline = configText.slice(list.getStart(config), last.getStart(config)).includes('\n');
    const lineStart = configText.lastIndexOf('\n', last.getStart(config)) + 1;
    const indent = configText.slice(lineStart, last.getStart(config));
    const trailingComma = list.elements.hasTrailingComma;
    const at = trailingComma ? configText.indexOf(',', last.getEnd()) + 1 : last.getEnd();
    const lead = trailingComma ? '' : ',';
    change = {
      span: { start: at, length: 0 },
      newText: multiline ? `${lead}\n${indent}${entry}${trailingComma ? ',' : ''}` : `${lead} ${entry}`,
    };
  }

  return {
    fixName: 'fluixiAddEnvPublic',
    description: `Add ${literal.text} to env.public`,
    changes: [{ fileName: configPath, textChanges: [change] }],
  };
}
