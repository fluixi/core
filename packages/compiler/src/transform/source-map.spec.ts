/**
 * What the emitted source map is actually worth.
 *
 * `mappings.length > 0` is the assertion a broken map also passes, and a map that
 * points somewhere plausible but wrong is worse than no map at all — a breakpoint
 * lands on the wrong line and the debugger looks broken rather than absent. So these
 * decode the map and trace generated positions back, asserting where they land.
 *
 * Two properties, and they are not the same one:
 *
 *  - code the transform never touched keeps its exact position. This is the one that
 *    must not regress, because it covers everything outside a template.
 *  - a hole resolves into its own template. Today it resolves to the template's
 *    opening rather than to the expression: the whole emitted root is applied as a
 *    single `overwrite`, so magic-string has one mapping for it. The tests below
 *    pin that as the current resolution rather than pretending it is precise —
 *    tightening them is the measure of any per-hole mapping work.
 */
import { describe, it, expect } from 'vitest';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { transformTemplates } from './templates.js';

const OPTS = { hmr: false } as never;

const SRC = [
  'import { createSignal } from "@fluixi/reactive";',
  '',
  'export function Greeting(props) {',
  '  const [count, setCount] = createSignal(0);',
  '  return html`<p class="hi" onClick=${() => setCount(count() + 1)}>${ props.userName }</p>`;',
  '}',
].join('\n');

/** Compile, then answer "what does the position of `text` in the output point at?". */
function trace(source: string, text: string) {
  const out = transformTemplates(source, 'greeting.ts', OPTS)!;
  const map = new TraceMap({ ...out.map, sourcesContent: [source] });
  const lines = out.code.split('\n');
  const line = lines.findIndex((l) => l.includes(text));
  if (line === -1) throw new Error(`${text} is not in the output`);
  const found = originalPositionFor(map, { line: line + 1, column: lines[line].indexOf(text) });
  const sourceLine = found.line == null ? '' : source.split('\n')[found.line - 1];
  return { ...found, sourceLine, lands: sourceLine.slice(found.column ?? 0) };
}

describe('the source map the transform emits', () => {
  it('puts untouched code exactly where it was', () => {
    // Nothing outside a template is rewritten, so every one of these positions has to
    // survive byte for byte — this is the half of the map a stack trace usually needs.
    expect(trace(SRC, 'createSignal').lands).toMatch(/^createSignal/);
    expect(trace(SRC, 'createSignal').line).toBe(1);
  });

  it('resolves a hole into its own template', () => {
    const hole = trace(SRC, 'props.userName');
    // The template opens on line 5 and the hole is on the same line here; what matters
    // is that a reader lands inside the template that produced the code.
    expect(hole.line).toBe(5);
    expect(hole.sourceLine).toContain('html`');
  });

  it('maps a whole emitted root to one position — the mapping is template-level', () => {
    // Both holes resolve to the same place: the start of the template literal, not the
    // expressions. This is the known limit of applying the root as one `overwrite`.
    // If per-hole mappings land, this expectation flips to two distinct columns and
    // that is exactly the win to assert.
    const handler = trace(SRC, 'setCount(count() + 1)');
    const text = trace(SRC, 'props.userName');
    expect(handler.line).toBe(text.line);
    expect(handler.column).toBe(text.column);
    expect(SRC.split('\n')[4].slice(handler.column!)).toMatch(/^html`/);
  });

  it('keeps a module with several templates from cross-mapping', () => {
    const src = [
      'export const a = () => html`<p>${ first }</p>`;',
      'export const b = () => html`<p>${ second }</p>`;',
    ].join('\n');
    // Each root is its own edit, so the two must not collapse onto one another.
    expect(trace(src, 'first').line).toBe(1);
    expect(trace(src, 'second').line).toBe(2);
  });
});
