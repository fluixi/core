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

/** Every statically named read of `publicEnv()` in a parsed module. */
export function publicEnvReads(ast: Node): EnvRead[] {
  const callees = new Set<string>();
  const bound = new Set<string>();
  const reads: EnvRead[] = [];

  for (const stmt of ast.body ?? []) {
    if (stmt.type !== 'ImportDeclaration' || stmt.source?.value !== '@fluixi/start/env') continue;
    for (const spec of stmt.specifiers ?? []) {
      if (spec.type === 'ImportSpecifier' && (spec.imported?.name ?? spec.imported?.value) === 'publicEnv') {
        callees.add(spec.local.name);
      }
    }
  }
  if (!callees.size) return reads;

  const isCall = (n: Node | null | undefined): boolean =>
    !!n && n.type === 'CallExpression' && n.callee?.type === 'Identifier' && callees.has(n.callee.name);
  const keyOf = (n: Node, computed: boolean): string | null => {
    if (!computed && n.type === 'Identifier') return n.name;
    if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
    return null;
  };

  // Two passes: bindings first, so a read above the declaration that hoists still counts.
  const walk = (node: any, visit: (n: Node) => void): void => {
    if (!node || typeof node.type !== 'string') return;
    visit(node);
    for (const key in node) {
      const value = node[key];
      if (key === 'parent' || !value || typeof value !== 'object') continue;
      if (Array.isArray(value)) for (const child of value) walk(child, visit);
      else walk(value, visit);
    }
  };

  walk(ast, (n) => {
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

  walk(ast, (n) => {
    if (n.type !== 'MemberExpression') return;
    const target = n.object;
    if (!(isCall(target) || (target.type === 'Identifier' && bound.has(target.name)))) return;
    const name = keyOf(n.property, n.computed);
    if (name) reads.push({ name, offset: n.property.start });
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
      if (!SOURCE.test(file) || /[\\/]node_modules[\\/]/.test(file) || !code.includes('publicEnv')) return null;

      let ast: Node;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }

      for (const read of publicEnvReads(ast)) {
        if (declared.has(read.name) || read.name.startsWith('VITE_')) continue;
        // Rollup already names the file in front of the message; the line is what it lacks.
        const where = `line ${sourceLine(file, read.name, code, read.offset)}`;
        this.error(
          `${where} reads ${read.name} from publicEnv(), which is not in env.public, so in the browser it is undefined. ` +
            `If it is public, add it to env.public in fluixi.config.ts. If it is not, read it on the server with serverEnv().`,
        );
      }
      return null;
    },
  };
}
