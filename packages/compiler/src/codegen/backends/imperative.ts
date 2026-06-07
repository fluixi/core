import type { CodegenBackend, CodegenResult } from '../backend.js';
import type { IRNode } from '../../ir/nodes.js';
import type { CompilerOptions } from '../../options.js';
import { RUNTIME_CONTRACT_V1 } from '../contract.js';

/**
 * Imperative fine-grained backend — emits createNativeElement/insert/spread/
 * delegateEvents/createComponent (RUNTIME_CONTRACT_V1), the runtime proven by
 * the @fluixi/dom contract tests.
 *
 * This codegen is live: the babel front-end emits it directly from the JSX AST
 * when given `backend: 'imperative'` (see ../../frontend/babel/plugin.ts and the
 * imperative.spec.ts runtime tests). The IR-driven emit() below — building from
 * the host-agnostic IR rather than the AST — is the remaining seam; it lets
 * non-babel front-ends (swc) reuse the same backend. Wiring AST -> IR -> emit()
 * is the next refactor.
 */
export const imperativeBackend: CodegenBackend = {
  name: 'imperative',
  contract: RUNTIME_CONTRACT_V1,
  emit(_node: IRNode, _options: CompilerOptions): CodegenResult {
    throw new Error(
      '[compiler] imperative backend IR-driven emit() not wired yet — the ' +
        "imperative codegen currently runs in the babel front-end (backend: 'imperative').",
    );
  },
};
