import type { IRNode } from '../ir/nodes.js';
import type { RuntimeContract } from './contract.js';
import type { CompilerOptions } from '../options.js';

export interface CodegenResult {
  code: string;
  map?: unknown;
  /** runtime symbols this output imports (subset of the backend's contract) */
  imports: string[];
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
