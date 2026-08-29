import * as DOM from '@fluixi/dom';
import { createMemo } from '@fluixi/reactive';
import { compileTemplate, type TemplateHole } from '@fluixi/compiler/compile';
import { parse } from '@fluixi/template-parser';
import { classify, type HoleContext, type HoleMap } from './classify.js';

export type TemplateResult = Node | (() => unknown);
export type Component = (props: never) => unknown;

const RUNTIME: Record<string, unknown> = {
  ...(DOM as unknown as Record<string, unknown>),
  createMemo,
};

// compileTemplate reports the helpers it emitted, but control-flow components
// are referenced by bare name and never appear in that list.
const CONTROL_FLOW = [
  'For',
  'Index',
  'Show',
  'Switch',
  'Match',
  'Portal',
  'Dynamic',
  'ErrorBoundary',
  'Suspense',
];

const registry = new Map<string, unknown>();

/** Make components resolvable as bare tags: `` html`<Counter />` ``. */
export function define(components: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(components)) registry.set(name, value);
}

interface Compiled {
  run: (values: readonly unknown[]) => TemplateResult;
}

function reads(context: HoleContext): boolean {
  return context === 'text' || context === 'attr' || context === 'control';
}

function describe(values: readonly unknown[], holes: HoleMap): TemplateHole[] {
  return values.map((value, i) => {
    const context = holes.get(i) ?? 'text';

    if (context === 'render') {
      return {
        code: `$$v[${i}]`,
        reactive: false,
        arrow: { params: ['$$item'], body: `$$v[${i}]($$item)`, bodyReactive: false },
      };
    }
    // An event handler and a component are functions too; calling them would
    // fire the handler or invoke the component outside its owner.
    if (typeof value === 'function' && reads(context)) {
      return { code: `$$v[${i}]()`, reactive: true };
    }
    return { code: `$$v[${i}]`, reactive: false };
  });
}

function resolveComponent(name: string): unknown {
  if (registry.has(name)) return registry.get(name);
  const global = (globalThis as unknown as Record<string, unknown>)[name];
  if (global !== undefined) return global;
  throw new Error(
    `[fluixi] <${name}> is not defined. Pass it as a hole — <\${${name}} /> — ` +
      `or register it with define({ ${name} }).`,
  );
}

function build(
  strings: TemplateStringsArray,
  values: readonly unknown[],
  svg: boolean,
): Compiled {
  const statics = strings as unknown as readonly string[];
  const parsed = parse(statics, { svg });
  const fatal = parsed.diagnostics.filter((d) => d.severity === 'error');
  if (fatal.length > 0) {
    throw new Error(
      `[fluixi] ${svg ? 'svg' : 'html'}\`\`: ${fatal.map((d) => d.message).join('; ')}`,
    );
  }

  const { holes, components } = classify(parsed);
  const { code, imports } = compileTemplate({ statics, holes: describe(values, holes) }, { svg });

  const missing = imports.filter((n) => !(n in RUNTIME));
  if (missing.length > 0) {
    throw new Error(`[fluixi] no runtime binding for: ${missing.join(', ')}`);
  }

  const helpers = Array.from(new Set([...imports, ...CONTROL_FLOW])).filter(
    (n) => n in RUNTIME,
  );
  const tags = Array.from(components).filter((n) => !helpers.includes(n));
  const names = [...helpers, ...tags];

  const factory = new Function(...names, '$$v', `return (${code});`) as (
    ...args: unknown[]
  ) => TemplateResult;

  return {
    run: (vals) =>
      factory(
        ...helpers.map((n) => RUNTIME[n]),
        ...tags.map(resolveComponent),
        vals,
      ),
  };
}

// The same call site hands back the same TemplateStringsArray on every
// evaluation, so it keys the cache. The emitted code differs by whether each hole
// held an accessor, though, and a site can be called both ways — so the shape is
// part of the key rather than something the first call fixes for good.
const cache = new WeakMap<TemplateStringsArray, Map<string, Compiled>>();

function shapeOf(values: readonly unknown[]): string {
  let shape = '';
  for (const value of values) shape += typeof value === 'function' ? 'f' : 'v';
  return shape;
}

function tag(svg: boolean) {
  return (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
    let shapes = cache.get(strings);
    if (!shapes) {
      shapes = new Map();
      cache.set(strings, shapes);
    }
    const shape = shapeOf(values);
    let compiled = shapes.get(shape);
    if (!compiled) {
      compiled = build(strings, values, svg);
      shapes.set(shape, compiled);
    }
    return compiled.run(values);
  };
}

export const html = tag(false);
export const svg = tag(true);

export type { HoleContext } from './classify.js';
