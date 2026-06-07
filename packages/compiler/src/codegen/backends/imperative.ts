import type { CodegenBackend, CodegenResult } from '../backend.js';
import type { IRNode, IRProp } from '../../ir/nodes.js';
import type { CompilerOptions } from '../../options.js';
import { RUNTIME_CONTRACT_V1 } from '../contract.js';

/**
 * Imperative fine-grained backend — emits createNativeElement/insert/spread/
 * createComponent (RUNTIME_CONTRACT_V1), the runtime proven by the @fluixi/dom
 * contract tests.
 *
 * emit() consumes the host-agnostic IR and returns a code string, so any
 * front-end (babel now, swc later) that can produce IR reuses this exact codegen.
 * The output mirrors what the babel front-end emits inline today:
 *
 *   element    -> (() => { const _el$ = createNativeElement(tag);
 *                          spread({ element: _el$, props });
 *                          insert(_el$, children); return _el$; })()
 *   component  -> createMemo(() => createComponent(Name, props))
 *   fragment   -> [ ...children ]
 */

const CONTROL_COMPONENT: Record<string, string> = {
  show: 'Show',
  for: 'For',
  index: 'Index',
  switch: 'Switch',
  match: 'Match',
  dynamic: 'Dynamic',
  errorBoundary: 'ErrorBoundary',
  suspense: 'Suspense',
};

function isIdent(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function propKey(name: string): string {
  return isIdent(name) ? name : JSON.stringify(name);
}

function propValue(p: IRProp): string {
  if (p.expr !== undefined) {
    // Events and non-reactive expressions pass through; reactive ones become thunks
    // so the runtime (spread/insert) can wire a render effect.
    return p.reactive ? `() => (${p.expr})` : `(${p.expr})`;
  }
  return JSON.stringify(p.literal ?? true);
}

/** Build a props object literal (or mergeProps(...) when spreads are present). */
function emitProps(props: IRProp[], childrenExpr: string | null, used: Set<string>): string {
  const spreads = props.filter((p) => p.kind === 'spread');
  const normal = props.filter((p) => p.kind !== 'spread');
  const entries = normal.map((p) => `${propKey(p.name)}: ${propValue(p)}`);
  if (childrenExpr != null) entries.push(`children: ${childrenExpr}`);
  const obj = `{ ${entries.join(', ')} }`;
  if (spreads.length > 0) {
    used.add('mergeProps');
    return `mergeProps(${spreads.map((s) => s.expr).join(', ')}, ${obj})`;
  }
  return obj;
}

function emitChildren(children: IRNode[], used: Set<string>): string {
  if (children.length === 1) return emitNode(children[0], used);
  return `[${children.map((c) => emitNode(c, used)).join(', ')}]`;
}

function emitComponent(name: string, props: IRProp[], children: IRNode[], used: Set<string>): string {
  used.add('createMemo');
  used.add('createComponent');
  const childrenExpr = children.length > 0 ? emitChildren(children, used) : null;
  return `createMemo(() => createComponent(${name}, ${emitProps(props, childrenExpr, used)}))`;
}

function emitNode(node: IRNode, used: Set<string>): string {
  switch (node.kind) {
    case 'text':
      return JSON.stringify(node.value);

    case 'expr':
      return node.reactive ? `() => (${node.code})` : `(${node.code})`;

    case 'fragment':
      if (node.children.length === 0) return 'null';
      return emitChildren(node.children, used);

    case 'component':
      return emitComponent(node.name, node.props, node.children, used);

    case 'control': {
      const name = CONTROL_COMPONENT[node.control] ?? node.control;
      used.add(name);
      return emitComponent(name, node.props, node.children, used);
    }

    case 'element': {
      used.add('createNativeElement');
      const tag = JSON.stringify(node.tag);
      const el = '_el$';
      const parts: string[] = [];
      const createArgs = node.svg ? `${tag}, true` : tag;
      parts.push(`const ${el} = createNativeElement(${createArgs});`);

      if (node.props.length > 0) {
        used.add('spread');
        const svgFlag = node.svg ? ', isSVG: true' : '';
        parts.push(`spread({ element: ${el}, props: ${emitProps(node.props, null, used)}${svgFlag} });`);
      }
      // Insert each child individually (like the jsx runtime's applyProps), so a
      // reactive/component child that isn't the only child still gets its own
      // reactive binding. A single insert(el, [array]) does NOT bind function
      // elements sitting inside the array.
      for (const child of node.children) {
        used.add('insert');
        const childCode = emitNode(child, used);
        const isFn =
          (child.kind === 'expr' && child.reactive) ||
          child.kind === 'component' ||
          child.kind === 'control';
        parts.push(isFn ? `insert(${el}, ${childCode}, null);` : `insert(${el}, ${childCode});`);
      }
      parts.push(`return ${el};`);
      return `(() => { ${parts.join(' ')} })()`;
    }
  }
}

export const imperativeBackend: CodegenBackend = {
  name: 'imperative',
  contract: RUNTIME_CONTRACT_V1,
  emit(node: IRNode, _options: CompilerOptions): CodegenResult {
    const used = new Set<string>();
    const code = emitNode(node, used);
    return { code, imports: Array.from(used) };
  },
};
