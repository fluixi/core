import type { IRNode } from '../ir/nodes.js';
import type { RuntimeContract } from './contract.js';
import type { CompilerOptions } from '../options.js';

export interface CodegenResult {
  code: string;
  map?: unknown;
  /** runtime symbols this output imports (subset of the backend's contract) */
  imports: string[];
  /**
   * Templates to declare once at module scope, so a static subtree is parsed once and
   * cloned per instance rather than rebuilt element by element.
   */
  templates?: StaticTemplate[];
}

export interface StaticTemplate {
  /** Identifier to declare, unique within the emitted unit. */
  id: string;
  /** The HTML the template is built from. */
  html: string;
  /** Root tag name, so hydration can match the server's node before adopting it. */
  tag: string;
  svg: boolean;
}

/**
 * A codegen backend turns IR into runtime calls. This is the swap point: the
 * imperative backend ships now; a template-clone backend (and hybrids/islands
 * variants) plug in later without touching the front-ends or IR.
 */
export interface CodegenBackend {
  /** stable id used in CompilerOptions.backend */
  name: string;
  /** the runtime contract this backend emits against */
  contract: RuntimeContract;
  emit(node: IRNode, options: CompilerOptions): CodegenResult;
}
