// @vitest-environment node
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// What every client-rendered Fluixi app pays before its own code: a counter, written as the
// compiler emits it, bundled and minified for production from source. A change that adds to
// the shared runtime shows here first. Lower the budget when a change makes it smaller.
const BUDGET_GZIP = 7_200;

const COUNTER_APP = `
import { addDelegatedEventListener, createComponent, delegateEvents, holeContent, holeEnd, holeScope, insert, render, templateNode } from "@fluixi/dom";
import { createMemo, signal } from "@fluixi/reactive/signal";
const _fxTmpl$0 = "<button><!--fx--><!--fx/-->: <!--fx--><!--fx/--></button>";
delegateEvents(["click"]);
function Counter(props) {
  const count = signal(0);
  return (() => { const _el$ = templateNode(_fxTmpl$0, "button", true); const _n$0 = _el$.firstChild; const _n$1 = holeEnd(_n$0); const _n$2 = _n$1.nextSibling; const _n$3 = _n$2.nextSibling; const _n$4 = holeEnd(_n$3); addDelegatedEventListener(_el$, "click", () => count.set((c) => c + props.step)); insert(_el$, holeScope(_n$0, () => () => props.label), _n$1, holeContent(_n$0, _n$1)); insert(_el$, holeScope(_n$3, () => () => count()), _n$4, holeContent(_n$3, _n$4)); return _el$; })();
}
render(() => createMemo(() => createComponent(Counter, { get step() { return 1; }, get label() { return "Count"; } })), document.getElementById("app"));
`;

async function gzipSize(source: string): Promise<number> {
  const result = await build({
    stdin: { contents: source, resolveDir: fileURLToPath(new URL('.', import.meta.url)), loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    conditions: ['development'],
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
    write: false,
    logLevel: 'silent',
  });
  return gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
}

describe('runtime size', () => {
  it(`keeps a client-rendered counter app under ${BUDGET_GZIP} bytes gzipped`, async () => {
    const size = await gzipSize(COUNTER_APP);
    expect(size).toBeLessThanOrEqual(BUDGET_GZIP);
  }, 30_000);
});
