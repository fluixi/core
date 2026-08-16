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
export { shapeOf } from '../analyze/expr-shape.js';
export { transformProps } from './props.js';
export type { PropsTransformOptions, PropsTransformResult, PropsDiagnostic } from './props.js';
export { planPropsDestructure, explainBail } from '../analyze/props-destructure.js';
export type { DestructurePlan, DestructureBail, PropsRead } from '../analyze/props-destructure.js';
