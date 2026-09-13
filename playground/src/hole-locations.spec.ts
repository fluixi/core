// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { observeGraph } from '@fluixi/devtools';
import { examples } from './examples';
import { compileFileWithOrigin } from './compile';
import { createRegistry } from './modules';

describe('the counter, compiled and run', () => {
  it('gives each binding its own line', async () => {
    const observed = observeGraph();
    const registry = createRegistry();
    (globalThis as never as Record<PropertyKey, unknown>)[Symbol.for('fluixi.playground.registry')] = registry;

    const file = examples.flatMap((e) => e.files).find((f) => f.path === 'src/Counter.tsx')!;
    const { code } = await compileFileWithOrigin(file.code, 'src/Counter.tsx');
    // Run the compiled module against the registry, the way a linked blob would.
    // Each import resolves against its own package, the way the linked blob's shim does.
    const body = code.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?/g,
      (_m, names: string, from: string) =>
        `const {${names}} = globalThis[Symbol.for('fluixi.playground.registry')][${JSON.stringify(from)}];`,
    );
    // `export function Counter` is a module declaration; this runs as a plain function body.
    const factory = new Function(`${body.replace(/\bexport\s+/g, '')}\nreturn Counter;`);
    const Counter = factory();

    const { render } = registry['@fluixi/core'] as { render: (f: () => unknown, e: Element) => void };
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => Counter({ start: 0, step: 1 }), host);
    observed.sample();

    const count = [...observed.graph.values()].find((n) => n.label === 'count');
    // `{count()}` is written on line 9 of Counter.tsx, column 25. The source map cannot say
    // that — every hole in a template traces back to the line the template opens at — so this
    // is the compiler's own mark, carried on the accessor to wherever the dom wires it up.
    const target = count?.targets?.[0];
    // A hole with nothing in it yet is a marker comment; the span is where it will go.
    expect(target?.element).toBe('slot in span.num');
    expect(target?.source?.line).toBe(9);
    expect(target?.source?.column).toBe(25);
    observed.detach();
  });
});
