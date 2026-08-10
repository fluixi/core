/**
 * The Fluixi transform: source in, source out, positions preserved.
 *
 * Runs the compiler over a module directly instead of as a plugin inside a
 * JavaScript toolchain. A parser is used as a library; nothing round-trips
 * through a host AST, so holes keep the author's text and edits carry a map.
 */
export { transformTemplates } from './templates.js';
export type { TransformOptions, TransformResult } from './templates.js';
export { moduleBindings } from './bindings.js';
export { shapeOf } from './estree-shape.js';
