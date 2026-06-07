/**
 * @fluixi/compiler — host-agnostic JSX compiler for KettleJS.
 *
 * Pipeline: front-end adapters (babel now, swc later) → IR → analyze →
 * transform → codegen backends (imperative now, template-clone later) emitting
 * against a versioned RuntimeContract.
 *
 * The babel front-end is exposed at the '@fluixi/compiler/babel' subpath.
 */
export * from './ir/nodes.js';
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
