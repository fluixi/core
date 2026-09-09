// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { compileFileWithOrigin } from './compile';

const SOURCE = `import { createSignal } from '@fluixi/core';

export function Counter() {
  const [count, setCount] = createSignal(0);
  return <button onClick={() => setCount(count() + 1)}>{count()}</button>;
}
`;

describe('tracing a compiled position home', () => {
  it('puts a position in the output back in the tsx', async () => {
    const { code, origin } = await compileFileWithOrigin(SOURCE, 'src/Counter.tsx');
    const lines = code.split('\n');

    // Find the compiled line that mentions the setter, then ask where it came from.
    const index = lines.findIndex((l) => l.includes('setCount'));
    expect(index).toBeGreaterThanOrEqual(0);
    const at = origin({ line: index + 1, column: lines[index].indexOf('setCount') });

    console.log('compiled line', index + 1, '->', at);
    expect(at).toBeDefined();
    // setCount is written on line 4 (declared) and line 5 (called).
    expect([4, 5]).toContain(at!.line);
  });

  it('says nothing rather than guessing for a position it cannot place', async () => {
    const { origin } = await compileFileWithOrigin(SOURCE, 'src/Counter.tsx');
    expect(origin({ line: 9999, column: 0 })).toBeUndefined();
  });
});
