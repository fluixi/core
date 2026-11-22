import { describe, it, expect } from 'vitest';
import { transformTemplates } from './templates.js';

const OPTS = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom', runtimeModule: '@fluixi/dom' };
const compile = (src: string) => transformTemplates(`import { C } from './c';\n${src}`, 't.tsx', OPTS)!.code;

describe('props passed to a component', () => {
  it('passes literals as plain values', () => {
    const code = compile('export const A = () => <C step={1} label="Count" ratio={-2.5} open={true} none={null} />;');
    expect(code).toContain('{ step: 1, label: "Count", ratio: -2.5, open: true, none: null }');
  });

  it('keeps a getter for anything that can change', () => {
    const code = compile('export const A = (p) => <C title={p.title} make={() => 1} text={`a`} />;');
    expect(code).toContain('get title() { return p.title; }');
    expect(code).toContain('get make() {');
    expect(code).toContain('get text() {');
  });

  it('keeps plain values beside the getters of a component written in a class method', () => {
    const code = compile('export class E { render() { return <C step={1} name={this.name} />; } }');
    expect(code).toContain('step: 1');
    expect(code).toContain('get name() {');
  });
});
