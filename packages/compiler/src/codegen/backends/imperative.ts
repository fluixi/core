import type { CodegenBackend, CodegenResult } from '../backend.js';
import type { IRNode } from '../../ir/nodes.js';
import type { CompilerOptions } from '../../options.js';
import { RUNTIME_CONTRACT_V1 } from '../contract.js';

/**
 * Imperative fine-grained backend — emits createNativeElement/insert/spread/
 * delegateEvents/createComponent (RUNTIME_CONTRACT_V1), the runtime proven by
 * the @fluixi/dom contract tests.
 *
 * NOTE: the IR-driven emit() below is the target shape. Today the actual JSX
 * transform is still performed by the babel front-end (which emits the jsx()
 * automatic runtime); wiring emit() to consume the IR and switching the
 * front-end to call it is migration Step 5.
 */
export const imperativeBackend: CodegenBackend = {
  name: 'imperative',
  contract: RUNTIME_CONTRACT_V1,
  emit(_node: IRNode, _options: CompilerOptions): CodegenResult {
    throw new Error(
      '[compiler] imperative backend emit() not wired yet — codegen is currently ' +
        'performed by the babel front-end. See migration Step 5.',
    );
  },
};
