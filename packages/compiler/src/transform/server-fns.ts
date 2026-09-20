/**
 * `"use server"`: a function carrying the directive runs only on the server and
 * is callable from the client over RPC.
 *
 *   const getUser = async (id) => { 'use server'; return db.users.find(id); };
 *
 * Server build keeps the body and registers it under a stable id; client build
 * drops the body entirely and leaves a stub that calls it. The id is
 * `hash(relativeFile):indexInFile` and has to come out the same on both builds,
 * so the walk order matters as much as the hash does.
 */
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { serverFnId } from './server-fn-id.js';

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

const RUNTIME = '@fluixi/start/server-fn';

export interface ServerFnOptions {
  ssr: boolean;
  filename: string;
  root?: string;
  runtimeModule?: string;
}

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

/** The `'use server'` directive on a function's block body, if it carries one. */
function directive(node: Node): Node | null {
  if (!FUNCTION_TYPES.has(node.type)) return null;
  const body = node.body as Node | undefined;
  if (!body || body.type !== 'BlockStatement') return null; // an expression body cannot carry one
  for (const d of (body.directives ?? []) as Node[]) {
    if (d.value?.value === 'use server') return d;
  }
  return null;
}

/**
 * Server functions in source order, not descending into one already found, a
 * nested `"use server"` belongs to the body that is about to be replaced or
 * shipped whole, exactly as the babel visitor's `path.skip()` decided.
 */
function findServerFns(node: any, out: Array<{ fn: Node; directive: Node }>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) findServerFns(child, out);
    return;
  }
  if (typeof node.type === 'string') {
    const found = directive(node as Node);
    if (found) {
      out.push({ fn: node as Node, directive: found });
      return; // do not descend
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    findServerFns(node[key], out);
  }
}

/** Returns `{ code, map }`, or null when the source has no `"use server"`. */
export function transformServerFns(
  code: string,
  options: ServerFnOptions,
): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
  if (!code.includes('use server')) return null;

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  const found: Array<{ fn: Node; directive: Node }> = [];
  findServerFns(ast.program, found);
  if (found.length === 0) return null;

  const helper = options.ssr ? '$$registerServerFn' : '$$createServerReference';
  const out = new MagicString(code);

  found.forEach(({ fn, directive: dir }, index) => {
    const id = serverFnId(options.filename, options.root, index);
    const declaration = fn.type === 'FunctionDeclaration';

    if (!options.ssr) {
      // The body never reaches the client: it is replaced, not emptied.
      const stub = `${helper}(${JSON.stringify(id)})`;
      out.overwrite(fn.start, fn.end, declaration ? `const ${fn.id.name} = ${stub};` : stub);
      return;
    }

    // Keep the body, drop the directive, wrap the function in its registration.
    out.remove(dir.start, dir.end);
    out.appendLeft(fn.start, declaration ? `const ${fn.id.name} = ${helper}(${JSON.stringify(id)}, ` : `${helper}(${JSON.stringify(id)}, `);
    out.appendRight(fn.end, declaration ? ');' : ')');
  });

  out.prepend(`import { ${helper} } from ${JSON.stringify(options.runtimeModule ?? RUNTIME)};\n`);

  return {
    code: out.toString(),
    map: out.generateMap({ source: options.filename, includeContent: true, hires: true }),
  };
}
