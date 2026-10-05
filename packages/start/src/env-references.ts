/**
 * The browser build refuses a read of a variable that is not public.
 *
 * `publicEnv()` in a browser holds exactly what `env.public` lists, so reading anything else
 * is `undefined` there: a typo, or a value that only exists on the server. Both used to surface
 * as a request sent to `undefined/api` or a login with no client id, far from the line that
 * read it. Checked where the name is written, so the build stops on that line instead.
 *
 * Catches `publicEnv().X`, `publicEnv()['X']`, `const { X } = publicEnv()`, and a member read
 * on a name bound to `publicEnv()` in the same module. A key computed at run time cannot be
 * known and is left alone. `VITE_` names are always public, as they always were.
 *
 * Only an app that declares `env.public`, only the browser build, only its own files.
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { ResolvedConfig } from './config.js';

const SOURCE = /\.[cm]?[jt]sx?$/;

interface Node {
  type: string;
  start: number;
  [key: string]: any;
}

export interface EnvRead {
  name: string;
  offset: number;
}

/** A test that is true only on the server, or only in the browser, as far as the build can tell. */
function sideOf(test: Node | null | undefined): 'server' | 'browser' | null {
  if (!test) return null;
  if (test.type === 'UnaryExpression' && test.operator === '!') {
    const inner = sideOf(test.argument);
    return inner === 'server' ? 'browser' : inner === 'browser' ? 'server' : null;
  }
  // `import.meta.env.SSR`, or the `false` a build may already have replaced it with.
  if (
    test.type === 'MemberExpression' &&
    test.property?.name === 'SSR' &&
    test.object?.type === 'MemberExpression' &&
    test.object.property?.name === 'env' &&
    test.object.object?.type === 'MetaProperty'
  ) {
    return 'server';
  }
  if (test.type === 'Literal' && test.value === false) return 'server';
  // `typeof window === 'undefined'` and its `!==` form, and the same for `document`.
  if (test.type === 'BinaryExpression' && ['===', '==', '!==', '!='].includes(test.operator)) {
    const [left, right] = [test.left, test.right];
    const typeofGlobal = (n: Node) =>
      n?.type === 'UnaryExpression' && n.operator === 'typeof' && ['window', 'document'].includes(n.argument?.name);
    const undef = (n: Node) => n?.type === 'Literal' && n.value === 'undefined';
    if ((typeofGlobal(left) && undef(right)) || (typeofGlobal(right) && undef(left))) {
      return test.operator.startsWith('=') ? 'server' : 'browser';
    }
  }
  return null;
}

/**
 * Walk, leaving out what only the server runs.
 *
 * A module shared by both sides may read a secret behind `import.meta.env.SSR` or a
 * `typeof window` check. The browser never runs that branch, so it is not a read to refuse.
 */
function walkBrowserSide(node: any, visit: (n: Node) => void): void {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
    const side = sideOf(node.test);
    walkBrowserSide(node.test, visit);
    if (side !== 'server') walkBrowserSide(node.consequent, visit);
    if (side !== 'browser') walkBrowserSide(node.alternate, visit);
    return;
  }
  if (node.type === 'LogicalExpression' && node.operator === '&&' && sideOf(node.left) === 'server') {
    walkBrowserSide(node.left, visit);
    return;
  }
  visit(node);
  for (const key in node) {
    const value = node[key];
    if (key === 'parent' || !value || typeof value !== 'object') continue;
    if (Array.isArray(value)) for (const child of value) walkBrowserSide(child, visit);
    else walkBrowserSide(value, visit);
  }
}

/** Every statically named read of `publicEnv()` or `env()` the browser would run. */
export function publicEnvReads(ast: Node): EnvRead[] {
  const objectCallees = new Set<string>();
  const keyCallees = new Set<string>();
  const specCallees = new Set<string>();
  const bound = new Set<string>();
  const reads: EnvRead[] = [];

  for (const stmt of ast.body ?? []) {
    if (stmt.type !== 'ImportDeclaration' || stmt.source?.value !== '@fluixi/start/env') continue;
    for (const spec of stmt.specifiers ?? []) {
      if (spec.type !== 'ImportSpecifier') continue;
      const imported = spec.imported?.name ?? spec.imported?.value;
      if (imported === 'publicEnv') objectCallees.add(spec.local.name);
      if (imported === 'env') keyCallees.add(spec.local.name);
      if (imported === 'pickEnv') specCallees.add(spec.local.name);
    }
  }
  if (!objectCallees.size && !keyCallees.size && !specCallees.size) return reads;

  const callTo = (n: Node | null | undefined, names: Set<string>): boolean =>
    !!n && n.type === 'CallExpression' && n.callee?.type === 'Identifier' && names.has(n.callee.name);
  const isCall = (n: Node | null | undefined) => callTo(n, objectCallees);
  const keyOf = (n: Node, computed: boolean): string | null => {
    if (!computed && n.type === 'Identifier') return n.name;
    if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
    return null;
  };

  // Two passes: bindings first, so a read above the declaration that hoists still counts.
  walkBrowserSide(ast, (n) => {
    if (n.type !== 'VariableDeclarator' || !isCall(n.init)) return;
    if (n.id.type === 'Identifier') bound.add(n.id.name);
    if (n.id.type === 'ObjectPattern') {
      for (const prop of n.id.properties) {
        if (prop.type !== 'Property') continue;
        const name = keyOf(prop.key, prop.computed);
        if (name) reads.push({ name, offset: prop.key.start });
      }
    }
  });

  walkBrowserSide(ast, (n) => {
    if (n.type === 'MemberExpression') {
      const target = n.object;
      if (!(isCall(target) || (target.type === 'Identifier' && bound.has(target.name)))) return;
      const name = keyOf(n.property, n.computed);
      if (name) reads.push({ name, offset: n.property.start });
    }
    // `env('KEY')`, and `$env('KEY')` once the compiler has rewritten it to an import.
    if (callTo(n, keyCallees)) {
      const first = n.arguments?.[0];
      if (first?.type === 'Literal' && typeof first.value === 'string') reads.push({ name: first.value, offset: first.start });
    }
    // `pickEnv({ field: 'KEY', other: { key: 'KEY' } })`: each key in the spec is a read.
    if (callTo(n, specCallees) && n.arguments?.[0]?.type === 'ObjectExpression') {
      for (const prop of n.arguments[0].properties) {
        const value = prop.type === 'Property' ? prop.value : null;
        const literal =
          value?.type === 'Literal'
            ? value
            : value?.type === 'ObjectExpression'
              ? value.properties.find((p: Node) => p.type === 'Property' && keyOf(p.key, p.computed) === 'key')?.value
              : null;
        if (literal?.type === 'Literal' && typeof literal.value === 'string') {
          reads.push({ name: literal.value, offset: literal.start });
        }
      }
    }
  });

  return reads;
}

const lineOf = (code: string, offset: number): number => code.slice(0, offset).split('\n').length;

/**
 * The line in the file as written. The transformed code has lost its types and JSX, so its
 * offsets can drift from the source; the first place the name appears in the original is
 * nearly always the read, and the transformed line is the fallback.
 */
function sourceLine(file: string, name: string, code: string, offset: number): number {
  try {
    const original = readFileSync(file, 'utf8');
    const at = original.search(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
    if (at >= 0) return lineOf(original, at);
  } catch {
    /* virtual or unreadable: fall through */
  }
  return lineOf(code, offset);
}

export function envReferencesVitePlugin(cfg: Pick<ResolvedConfig, 'root' | 'env'>): any {
  const declared = new Set(cfg.env?.public ?? []);

  return {
    name: 'fluixi:env-references',
    transform(this: any, code: string, id: string, options?: { ssr?: boolean }) {
      if (!declared.size || options?.ssr) return null;
      const file = id.replace(/\?.*$/, '');
      if (!SOURCE.test(file) || /[\\/]node_modules[\\/]/.test(file) || !/publicEnv|pickEnv|\benv\b|__fx_env/.test(code)) return null;

      let ast: Node;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }

      for (const read of publicEnvReads(ast)) {
        if (declared.has(read.name) || read.name.startsWith('VITE_')) continue;
        // Rollup names the file in front of a plugin's error, Rolldown (Vite 8) does not: there
        // the file is ours to name, or the message says which line but not of what.
        const named = this.meta?.rolldownVersion ? `${relative(cfg.root, file)}: ` : '';
        const where = `${named}line ${sourceLine(file, read.name, code, read.offset)}`;
        this.error(
          `${where} reads ${read.name} in code the browser runs, and ${read.name} is not in env.public: the browser has no value for it. ` +
            `If it is public, add it to env.public in fluixi.config.ts. If it is a secret, read it on the server (an API route, middleware, ` +
            `a "use server" function, a .server file) and pass the page what it needs.`,
        );
      }
      return null;
    },
  };
}
