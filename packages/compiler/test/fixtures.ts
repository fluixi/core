/**
 * Compiling and running a fixture, for the tests.
 *
 * `compile` is the whole compiler as an app sees it — the same entry the bundler
 * adapters call. `load` then runs the result against the real runtime, which is
 * how most of these tests assert: on the DOM that comes out, not on the shape of
 * the emitted code.
 *
 * Babel appears here only to turn ESM into CJS so `new Function` can evaluate the
 * module. That is a property of the test, not of the compiler.
 */
import * as babel from '@babel/core';
import cjsPlugin from '@babel/plugin-transform-modules-commonjs';
import { transformTemplates, type TransformOptions } from '../src/transform/index.js';

export interface FixtureOptions extends TransformOptions {
  filename?: string;
  /** Where the emitted runtime symbols come from. Defaults to @fluixi/dom. */
  signalModule?: string;
}

/** Compile a source string. Returns it unchanged when there is nothing to compile. */
export function compile(src: string, options: FixtureOptions = {}): string {
  const { filename = 't.tsx', signalModule, ...rest } = options;
  const out = transformTemplates(src, filename, {
    runtimeModule: signalModule ?? rest.runtimeModule ?? '@fluixi/dom',
    controlFlowModule: rest.controlFlowModule ?? signalModule ?? '@fluixi/dom',
    ...rest,
  });
  return out?.code ?? src;
}

/** Whitespace-insensitive view of emitted code, so assertions ignore line breaks. */
export const flat = (s: string): string => s.replace(/\s+/g, ' ');

/**
 * Evaluate a compiled module. `modules` maps a bare specifier to what `require`
 * should hand back; anything not listed is a failure rather than a silent stub,
 * so a test cannot pass while importing something the compiler invented.
 */
export function load(esm: string, modules: Record<string, unknown>): any {
  const cjs = babel.transformSync(esm, {
    filename: 't.js',
    configFile: false,
    babelrc: false,
    plugins: [cjsPlugin],
  })!.code!;

  const module = { exports: {} as any };
  const require = (id: string): unknown => {
    if (id in modules) return modules[id];
    throw new Error(`unexpected require: ${id}`);
  };
  new Function('exports', 'require', 'module', cjs)(module.exports, require, module);
  return module.exports;
}

/** Compile and run in one step. */
export function run(src: string, modules: Record<string, unknown>, options?: FixtureOptions): any {
  return load(compile(src, options), modules);
}
