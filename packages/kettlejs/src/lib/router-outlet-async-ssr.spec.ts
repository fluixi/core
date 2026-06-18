// @vitest-environment jsdom
/**
 * Scenario 2 — the storefront's REAL route shape under async SSR.
 *
 * A lazy route rendered through router-next's <Outlet/>, whose component fetches a
 * resource, on a SINGLE cold renderToStringAsync (no pre-warm). The storefront does
 * exactly this and serialises the <Suspense> fallback (spinner) instead of the route
 * content — JS-disabled shows only the shell + spinner, no products.
 *
 * Distinct from suspense-async-ssr.spec.ts (a DIRECT lazy child — scenario 1, fixed)
 * and ssr-context-detach.spec.ts (which warms the lazy cache across two renders to
 * sidestep the cold path). This drives the Router with createMemoryHistory('/') and
 * asserts the resolved resource content is in the payload after one async render.
 *
 * Compiles REAL JSX through the imperative backend (hand-written createComponent did
 * NOT reproduce the related detach bug).
 *
 * ── FIXED (2026-06-18) — two changes, both needed ────────────────────────────
 * Took two distinct bugs, one in the reactive core and one in the async-SSR drain:
 *
 * (1) reactive/signal.ts — `propagateDirty` was INCONSISTENT between its two impls.
 *     The memo-recompute one schedules a STALE non-pure effect (pushes to
 *     toUpdate/Updates); the signal-WRITE one only marked it STALE and returned
 *     WITHOUT scheduling. So when `setInFallback(false)`'s write marked the <Suspense>
 *     OUTPUT insert effect STALE, the later output-memo recompute skipped it (it only
 *     schedules when prevState===CLEAN) → it never re-ran → <main> kept the fallback.
 *     Fix: the signal-write path now schedules the STALE effect too (mirrors the memo
 *     path). Makes the resolved content reach <main> reactively.
 *
 * (2) dom/.../server/render.ts — the component tree is built LAZILY (a router <Outlet/>
 *     sits behind deferred memos), so the initial render created NO resources and
 *     ctx.pending was empty when the drain checked → it exited and serialized the
 *     fallback; the route only rendered when serializeNode finally read the tree.
 *     Fix: renderToStringAsync now PROBE-serializes the tree before the drain (and
 *     after each round) to force evaluation, so lazy/route resources self-register in
 *     ctx.pending before the drain decides it's done. (Scenario 1 dodged this because
 *     Suspense's triggerLazy eagerly reads a DIRECT lazy child; the Outlet hid it.)
 *
 * Both suites + this test green (reactive 187 / dom 40 / kettlejs 80). Note: the
 * storefront still doesn't pass the request URL to <Router> on the server (app.tsx
 * ignores props.url → defaults to createBrowserHistory; only '/' SSR-matches) — pass
 * history={createMemoryHistory(url)} there to SSR non-'/' routes.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import imperativePlugin from '@fluixi/compiler/babel';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Kettle from '@fluixi/kettlejs';
import * as RouterNext from '@fluixi/kettlejs/router-next';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';

// Minimal ESM->CJS so we can eval the compiled module with a require map.
function cjsTransform({ types: t }: any): any {
  return {
    visitor: {
      ImportDeclaration(path: any) {
        const source = path.node.source.value;
        const props: any[] = [];
        let nsName: string | null = null;
        let defName: string | null = null;
        for (const s of path.node.specifiers) {
          if (t.isImportDefaultSpecifier(s)) defName = s.local.name;
          else if (t.isImportNamespaceSpecifier(s)) nsName = s.local.name;
          else
            props.push(
              t.objectProperty(
                t.identifier(s.imported.name),
                t.identifier(s.local.name),
                false,
                s.imported.name === s.local.name,
              ),
            );
        }
        const req = t.callExpression(t.identifier('require'), [t.stringLiteral(source)]);
        const decls: any[] = [];
        if (nsName) decls.push(t.variableDeclarator(t.identifier(nsName), req));
        if (defName)
          decls.push(t.variableDeclarator(t.identifier(defName), t.memberExpression(req, t.identifier('default'))));
        if (props.length) decls.push(t.variableDeclarator(t.objectPattern(props), req));
        if (!decls.length) return path.remove();
        path.replaceWith(t.variableDeclaration('const', decls));
      },
      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          const decl = path.node.declaration;
          const names: string[] = [];
          if (t.isVariableDeclaration(decl)) for (const d of decl.declarations) names.push(d.id.name);
          else if (decl.id) names.push(decl.id.name);
          path.replaceWithMultiple([
            decl,
            ...names.map((n) =>
              t.expressionStatement(
                t.assignmentExpression('=', t.memberExpression(t.identifier('exports'), t.identifier(n)), t.identifier(n)),
              ),
            ),
          ]);
        } else {
          path.replaceWithMultiple(
            path.node.specifiers.map((s: any) =>
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(t.identifier('exports'), t.identifier(s.exported.name)),
                  t.identifier(s.local.name),
                ),
              ),
            ),
          );
        }
      },
    },
  };
}

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/kettlejs': Kettle,
  '@fluixi/kettlejs/router-next': RouterNext,
};

function load(src: string): any {
  const opts = {
    backend: 'imperative' as const,
    importSource: '@fluixi/dom',
    signalModule: '@fluixi/dom',
    controlFlowModule: '@fluixi/dom',
    hoistStatics: false,
  };
  const step1 = babel.transformSync(src, {
    filename: 't.tsx',
    configFile: false,
    babelrc: false,
    plugins: [[imperativePlugin as any, opts]],
  })!.code!;
  const code = babel.transformSync(step1, {
    filename: 't.js',
    configFile: false,
    babelrc: false,
    plugins: [cjsTransform],
  })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

beforeAll(() => {
  ensureIntegration();
  setServerMode(true);
});

describe('SSR: lazy route + resource through <Outlet/> (storefront shape)', () => {
  it('resolves the route content on a single cold async render', async () => {
    const src = `
      import { Suspense, lazy } from '@fluixi/kettlejs';
      import { createResource } from '@fluixi/reactive/signal';
      import { Router, Outlet, createMemoryHistory } from '@fluixi/kettlejs/router-next';

      const tick = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms || 5));

      function Home() {
        const [data] = createResource(() => tick('PRODUCTS'));
        return <div class="home">{data()}</div>;
      }
      const HomeLazy = lazy(() => Promise.resolve({ default: Home }));

      // Mirrors the storefront RootLayout: <Suspense><Outlet/></Suspense> inside the
      // matched layout route; the lazy page sits at the next depth.
      function Layout() {
        return (
          <main>
            <Suspense fallback={<span>SPINNER</span>}>
              <Outlet />
            </Suspense>
          </main>
        );
      }

      const routes = [
        { path: '/', component: Layout, children: [{ path: '/', component: HomeLazy }] },
      ];

      export function App() {
        return <Router routes={routes} history={createMemoryHistory('/')} />;
      }
    `;
    const { App } = load(src);

    const html = await renderToStringAsync(() => App());

    expect(html).toContain('PRODUCTS');   // route content server-rendered
    expect(html).not.toContain('SPINNER'); // not the fallback
  });
});
