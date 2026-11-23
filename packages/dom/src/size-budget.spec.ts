// @vitest-environment node
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// What a Fluixi app pays before its own code: a counter, written as the compiler emits it,
// bundled and minified for production from source. A change that adds to the shared runtime
// shows here first. Lower a budget when a change makes it smaller.
//
// Browser-only output (`hydratable: false`): single-page apps and standalone custom elements.
const CLIENT_BUDGET_GZIP = 5_340;

const CLIENT_COUNTER = `
import { createComponent, delegateEvents, insert, render, template as _fxTemplate } from "@fluixi/dom";
import { signal } from "@fluixi/reactive/signal";
const _fxTmpl$0 = _fxTemplate("<button>: </button>");
delegateEvents(["click"]);
function Counter(props) {
  const count = signal(0);
  return (() => { const _el$ = _fxTmpl$0(); const _n$0 = _el$.firstChild; _el$.$$click = () => count.set((c) => c + props.step); insert(_el$, () => props.label, _n$0); insert(_el$, () => count()); return _el$; })();
}
render(() => createComponent(Counter, { step: 1, label: "Count" }), document.getElementById("app"));
`;

// Hydratable output, the default: the same counter as a server-rendered app's browser bundle
// compiles it, before `hydrate()` brings in the hydration code.
const HYDRATABLE_BUDGET_GZIP = 5_600;

const HYDRATABLE_COUNTER = `
import { createComponent, delegateEvents, holeContent, holeEnd, holeScope, insert, render, templateNode } from "@fluixi/dom";
import { signal } from "@fluixi/reactive/signal";
const _fxTmpl$0 = "<button><!--fx--><!--fx/-->: <!--fx--><!--fx/--></button>";
delegateEvents(["click"]);
function Counter(props) {
  const count = signal(0);
  return (() => { const _el$ = templateNode(_fxTmpl$0, "button", true); const _n$0 = _el$.firstChild; const _n$1 = holeEnd(_n$0); const _n$2 = _n$1.nextSibling; const _n$3 = _n$2.nextSibling; const _n$4 = holeEnd(_n$3); _el$.$$click = () => count.set((c) => c + props.step); insert(_el$, holeScope(_n$0, () => () => props.label), _n$1, holeContent(_n$0, _n$1)); insert(_el$, holeScope(_n$3, () => () => count()), _n$4, holeContent(_n$3, _n$4)); return _el$; })();
}
render(() => createComponent(Counter, { step: 1, label: "Count" }), document.getElementById("app"));
`;

async function gzipSize(source: string): Promise<number> {
  const result = await build({
    stdin: { contents: source, resolveDir: fileURLToPath(new URL('.', import.meta.url)), loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    conditions: ['development'],
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', __FLUIXI_SERVER__: 'false' },
    write: false,
    logLevel: 'silent',
  });
  return gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
}

describe('runtime size', () => {
  it(`keeps a browser-only counter app under ${CLIENT_BUDGET_GZIP} bytes gzipped`, async () => {
    expect(await gzipSize(CLIENT_COUNTER)).toBeLessThanOrEqual(CLIENT_BUDGET_GZIP);
  }, 30_000);

  it(`keeps the hydratable counter app under ${HYDRATABLE_BUDGET_GZIP} bytes gzipped`, async () => {
    expect(await gzipSize(HYDRATABLE_COUNTER)).toBeLessThanOrEqual(HYDRATABLE_BUDGET_GZIP);
  }, 30_000);
});
