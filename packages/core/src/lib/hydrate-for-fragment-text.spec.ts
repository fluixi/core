// @vitest-environment jsdom
/**
 * A list whose items are fragments: a text that only some items have, then a link. The text a
 * server rendered came back garbled after hydration, separators doubled and words run together.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Fluixi from '@fluixi/core';
import * as RouterNext from './router/index.js';
import * as Head from '@fluixi/head';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import { startClient } from './client/index.js';

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
              t.objectProperty(t.identifier(s.imported.name), t.identifier(s.local.name), false, s.imported.name === s.local.name),
            );
        }
        const req = t.callExpression(t.identifier('require'), [t.stringLiteral(source)]);
        const decls: any[] = [];
        if (nsName) decls.push(t.variableDeclarator(t.identifier(nsName), req));
        if (defName) decls.push(t.variableDeclarator(t.identifier(defName), t.memberExpression(req, t.identifier('default'))));
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
        }
      },
    },
  };
}

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/core': Fluixi,
  '@fluixi/core/router': RouterNext,
  '@fluixi/head': Head,
};

function load(src: string): any {
  const opts = {
    importSource: '@fluixi/dom',
    signalModule: '@fluixi/dom',
    controlFlowModule: '@fluixi/dom',
  };
  const step1 = transformTemplates(src, 't.tsx', { ...opts, runtimeModule: opts.signalModule })?.code ?? src;
  const code = babel.transformSync(step1, { filename: 't.js', configFile: false, babelrc: false, plugins: [cjsTransform] })!.code!;
  const m = { exports: {} as any };
  const req = (id: string) => {
    if (id in REQUIRE_MAP) return REQUIRE_MAP[id];
    throw new Error('unexpected require: ' + id);
  };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => ensureIntegration());

async function hydrateText(src: string): Promise<{ server: string; client: string; links: number }> {
  const { App, appRoutes } = load(src);
  setServerMode(true);
  const html = await renderToStringAsync(() => App({ url: '/' }));
  setServerMode(false);
  document.body.innerHTML = `<div id="app">${html}</div>`;
  const server = document.querySelector('#app .popular')!.textContent ?? '';
  await startClient(App as any, { root: '#app', hydrate: true, routes: appRoutes });
  await tick(); await tick(); await tick();
  const p = document.querySelector('#app .popular')!;
  return { server, client: p.textContent ?? '', links: p.querySelectorAll('a').length };
}

const app = (item: string) => `
  import { For } from '@fluixi/core';
  import { Router, Link, createMemoryHistory } from '@fluixi/core/router';

  const WORDS = ['home', 'arrow', 'user'];
  function Home() {
    return (
      <p class="popular">
        Popular:{' '}
        <For each={WORDS}>{(word, index) => <>{index() > 0 ? ' · ' : ''}${item}</>}</For>
      </p>
    );
  }
  export const appRoutes = [{ path: '/', component: Home }];
  export function App(props) {
    const history = typeof window === 'undefined' ? createMemoryHistory((props && props.url) || '/') : undefined;
    return <Router routes={appRoutes} history={history} />;
  }
`;

describe('hydration: fragments in a list with a conditional text before a link', () => {
  it('keeps the server text with a router Link', async () => {
    const r = await hydrateText(app(`<Link href={'/q/' + word}>{word}</Link>`));
    expect(r.server).toBe('Popular: home · arrow · user');
    expect(r.client).toBe(r.server);
    expect(r.links).toBe(3);
  });

  it('keeps the server text with a plain anchor', async () => {
    const r = await hydrateText(app(`<a href={'/q/' + word}>{word}</a>`));
    expect(r.server).toBe('Popular: home · arrow · user');
    expect(r.client).toBe(r.server);
    expect(r.links).toBe(3);
  });
});
