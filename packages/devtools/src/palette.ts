// One colour per kind, in one place.
//
// The graph, the tree and the inspector each used to carry their own copy as a `var(--x, #hex)`
// fallback, and nothing defined the variables, so the fallbacks were the real palette and the
// three drifted. A kind added to one was uncoloured in the others, and `provider` came out the
// same pink as `component`.
//
// Hues are spread around the wheel rather than grouped by role: a graph is read by picking one
// card out of many, so what matters is that neighbours differ.
import type { NodeKind } from './instrument.js';

/** Element rows exist only in the tree, which is why this is wider than NodeKind. */
export type ColouredKind = NodeKind | 'element';

export const KIND_COLOR: Record<ColouredKind, string> = {
  state: '#34d399',
  memo: '#a78bfa',
  effect: '#fbbf24',
  store: '#38bdf8',
  resource: '#fb7185',
  component: '#f0abfc',
  provider: '#fb923c',
  control: '#22d3ee',
  router: '#818cf8',
  handler: '#f472b6',
  context: '#a3e635',
  directive: '#5eead4',
  binding: '#5eead4',
  setter: '#fb7185',
  group: '#8a90a2',
  element: '#8a90a2',
};

/** The variable a host can set to override one, per kind. */
export const kindVar = (kind: ColouredKind): string => `--fx-kind-${kind}`;

/** `var(--fx-kind-memo, #a78bfa)`, so a host may theme it and nothing breaks if it does not. */
export const kindColor = (kind: ColouredKind): string =>
  `var(${kindVar(kind)}, ${KIND_COLOR[kind]})`;

const KINDS = Object.keys(KIND_COLOR) as ColouredKind[];

/** One rule per kind, built from the table so a new kind cannot be missed in one host. */
export function kindRules(selector: (kind: ColouredKind) => string, property: string): string {
  return KINDS.map((kind) => `${selector(kind)} { ${property}: ${kindColor(kind)}; }`).join('\n');
}
