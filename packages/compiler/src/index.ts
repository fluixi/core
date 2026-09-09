/**
 * @fluixi/compiler — host-agnostic JSX compiler for Fluixi.
 *
 * Pipeline: front-end adapters (babel now, swc later) → IR → analyze →
 * transform → codegen backends (imperative now, template-clone later) emitting
 * against a versioned RuntimeContract.
 *
 * The babel front-end is exposed at the '@fluixi/compiler/babel' subpath.
 */
export * from './ir/nodes.js';
// The reactivity rule, expressed over shapes rather than a parser's AST — so a
// front-end supplies the mapping and inherits the semantics.
export * from './analyze/reactive-expr.js';
// analyzeReactiveGraph is not here: it parses, and this entry reaches no babel — the
// ts-plugin imports it and a stray parser is a module that fails to resolve for it. It is
// `@fluixi/compiler/analyze`.
// Template lowering + the Babel-free compile entry. `compileTemplate` goes from
// a parsed template to runtime calls without a JavaScript toolchain in the path.
export { lowerTemplate, type TemplateHole } from './lower/template.js';
export { cleanTemplateText } from './lower/text.js';
export * from './lower/compile-template.js';
// Component resolution — shared by the compiler, the TS plugin (to synthesise the
// import the author did not write) and codemods, so all three agree on one answer.
export * from './resolve/component-resolver.js';
export * from './resolve/component-globals.js';
export * from './resolve/write-globals.js';
export * from './resolve/builtins.js';
export * from './resolve/resolve-ir.js';
export * from './options.js';
export * from './frontend/types.js';
export * from './codegen/contract.js';
export * from './codegen/backend.js';
export { imperativeBackend } from './codegen/backends/imperative.js';

import type { CodegenBackend } from './codegen/backend.js';
import { imperativeBackend } from './codegen/backends/imperative.js';

/** Registry of available codegen backends (keyed by CompilerOptions.backend). */
export const backends: Record<string, CodegenBackend> = {
  imperative: imperativeBackend,
};
