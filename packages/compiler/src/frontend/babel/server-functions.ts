/**
 * `"use server"` transform. A function carrying the directive is a server function:
 * it runs only on the server, callable from the client over RPC.
 *
 *   const getUser = async (id) => { 'use server'; return db.users.find(id); };
 *
 * - **Server build** (`ssr: true`): keep the body, register it by a stable id so the
 *   RPC dispatcher can find it → `$$registerServerFn("id", async (id) => {…})`.
 * - **Client build** (`ssr: false`): drop the body (server-only code never ships) and
 *   replace it with an RPC stub → `$$createServerReference("id")`.
 *
 * The id is `hash(relativeFile) + ':' + indexWithinFile`, computed identically on both
 * builds (same source, same order) so client stub and server registration agree.
 */
import { transformSync } from '@babel/core';

const RUNTIME = '@fluixi/start/server-fn';

// djb2 — tiny, stable, dependency-free. Hex, so the id is a valid identifier suffix.
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function serverFunctionsBabelPlugin({ types: t }: any) {
  return {
    name: 'fluixi-server-functions',
    visitor: {
      Program: {
        enter(_path: any, state: any) {
          state.fxIndex = 0;
          state.fxUsed = null as null | string; // imported helper name
        },
        exit(path: any, state: any) {
          if (!state.fxUsed) return;
          path.unshiftContainer(
            'body',
            t.importDeclaration(
              [t.importSpecifier(t.identifier(state.fxUsed), t.identifier(state.fxUsed))],
              t.stringLiteral(state.opts.runtimeModule || RUNTIME),
            ),
          );
        },
      },
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': (
        path: any,
        state: any,
      ) => {
        const body = path.node.body;
        if (!t.isBlockStatement(body)) return; // arrow with expression body can't carry a directive
        const dirs = body.directives || [];
        const di = dirs.findIndex((d: any) => d.value.value === 'use server');
        if (di < 0) return;
        body.directives.splice(di, 1); // strip the directive

        const rel = (state.opts.filename || state.filename || 'unknown').replace(
          state.opts.root ? state.opts.root + '/' : '',
          '',
        );
        const id = `${hash(rel)}:${state.fxIndex++}`;
        const ssr = !!state.opts.ssr;
        const helper = ssr ? '$$registerServerFn' : '$$createServerReference';
        state.fxUsed = helper;

        const replacement = ssr
          ? t.callExpression(t.identifier(helper), [
              t.stringLiteral(id),
              path.isFunctionDeclaration()
                ? t.functionExpression(
                    null,
                    path.node.params,
                    body,
                    path.node.generator,
                    path.node.async,
                  )
                : path.node,
            ])
          : t.callExpression(t.identifier(helper), [t.stringLiteral(id)]);

        if (path.isFunctionDeclaration()) {
          // function f(){…} → const f = wrap(…)  (loses hoisting; acceptable)
          path.replaceWith(
            t.variableDeclaration('const', [t.variableDeclarator(path.node.id, replacement)]),
          );
        } else {
          path.replaceWith(replacement);
        }
        path.skip();
      },
    },
  };
}

export interface ServerFnTransformOptions {
  ssr: boolean;
  filename: string;
  root?: string;
}

/** Returns `{ code, map }`, or null when the source has no `"use server"`. */
export function transformServerFunctions(
  code: string,
  opts: ServerFnTransformOptions,
): { code: string; map: any } | null {
  if (!code.includes('use server')) return null;
  const result = transformSync(code, {
    filename: opts.filename,
    configFile: false,
    babelrc: false,
    sourceMaps: true,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: [[serverFunctionsBabelPlugin, opts]],
  });
  if (!result?.code) return null;
  return { code: result.code, map: result.map };
}
