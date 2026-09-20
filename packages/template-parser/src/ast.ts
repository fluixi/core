/**
 * The Template AST: the stable, host-agnostic contract this package exists to
 * produce. It is deliberately NOT the compiler's codegen IR: it models the
 * template *as written* (every directive is an explicit node, every node keeps
 * a source span, whitespace is preserved) so it can power the compiler AND the
 * language server, TypeScript plugin, and Biome/formatter alike.
 *
 * Design rules baked into these types:
 *  - Expression holes (`${…}`) are OPAQUE SLOTS. A node stores the hole's
 *    integer `index` (its position in the template's `expressions[]`) and its
 *    source span: never resolved JS. Each consumer binds a slot to its own
 *    representation afterward (a Babel node in the compiler, a `ts.Expression`
 *    in the LSP, raw text in Biome). This single seam is what lets one parser
 *    serve every downstream tool.
 *  - Directives are explicit node kinds, never stringly-typed attributes.
 *  - Every node carries `loc`, `kind`, and (via the tree walk) a `parent`.
 */

/** A half-open source span `[start, end)` in template-coordinate space. */
export interface SourceSpan {
  start: number;
  end: number;
}

/** Namespaces the parser tracks so SVG (and foreign content) lower correctly. */
export type Namespace = 'html' | 'svg' | 'mathml';

// ---------------------------------------------------------------------------
// Node kinds
// ---------------------------------------------------------------------------

export type NodeKind =
  | 'Root'
  | 'Element'
  | 'Component'
  | 'Fragment'
  | 'Text'
  | 'Comment'
  | 'Expression';

export type AttrKind =
  | 'Attribute'
  | 'PropertyBinding'
  | 'EventBinding'
  | 'RefBinding'
  | 'Spread'
  | 'IfDirective'
  | 'ElseDirective'
  | 'EachDirective'
  | 'BindDirective'
  | 'ClassDirective'
  | 'StyleDirective'
  | 'UseDirective'
  | 'LoadDirective'
  | 'Slot';

/** Fields shared by every node. `parent` is wired by {@link setParents}. */
export interface NodeBase {
  loc: SourceSpan;
  parent?: TemplateNode | null;
  /** Free-form bag for downstream passes (binding results, type info, etc.). */
  metadata?: Record<string, unknown>;
}

export type TemplateNode =
  | RootNode
  | ElementNode
  | ComponentNode
  | FragmentNode
  | TextNode
  | CommentNode
  | ExpressionNode;

/** Anything that can attach to an element/component opening tag. */
export type AttributeLikeNode =
  | AttributeNode
  | PropertyBindingNode
  | EventBindingNode
  | RefBindingNode
  | SpreadNode
  | IfDirectiveNode
  | ElseDirectiveNode
  | EachDirectiveNode
  | BindDirectiveNode
  | ClassDirectiveNode
  | StyleDirectiveNode
  | UseDirectiveNode
  | LoadDirectiveNode
  | SlotNode;

// ---------------------------------------------------------------------------
// Container / content nodes
// ---------------------------------------------------------------------------

export interface RootNode extends NodeBase {
  kind: 'Root';
  children: TemplateNode[];
}

export interface ElementNode extends NodeBase {
  kind: 'Element';
  tag: string;
  namespace: Namespace;
  attributes: AttributeLikeNode[];
  children: TemplateNode[];
  selfClosing: boolean;
  /** Raw-text element (`script`/`style`/`textarea`/`title`), children kept verbatim. */
  rawText: boolean;
}

export interface ComponentNode extends NodeBase {
  kind: 'Component';
  /** Capitalized name or member path (`Ctx.Provider`) as written; '' for a dynamic tag. */
  tag: string;
  /**
   * Dynamic tag `<${Comp} />`: the hole index of the component expression. When
   * set, `tag` is '' and the component identity comes from this hole, which
   * also means the referenced binding is visible to TypeScript (no "unused").
   */
  tagHole: number | null;
  attributes: AttributeLikeNode[];
  children: TemplateNode[];
  selfClosing: boolean;
}

export interface FragmentNode extends NodeBase {
  kind: 'Fragment';
  children: TemplateNode[];
}

/** Preserved verbatim (raw); whitespace normalization is a lowering concern. */
export interface TextNode extends NodeBase {
  kind: 'Text';
  value: string;
  /** Inside a raw-text element: do not whitespace-normalize when lowering. */
  raw: boolean;
}

export interface CommentNode extends NodeBase {
  kind: 'Comment';
  value: string;
}

/** A `${…}` in child/text position. */
export interface ExpressionNode extends NodeBase {
  kind: 'Expression';
  hole: number;
}

// ---------------------------------------------------------------------------
// Attribute / directive nodes
// ---------------------------------------------------------------------------

/** A single interpolation part of an attribute value. */
export type ValuePart = { text: string } | { hole: number };

/**
 * `name`, `name="static"`, `name=${x}`, `name="a ${x} b"`, `?bool`, `?bool=${x}`.
 * `value === null` is a valueless attribute (boolean true). `boolean` marks the
 * lit `?name` prefix.
 */
export interface AttributeNode extends NodeBase {
  kind: 'Attribute';
  name: string;
  value: AttrValue | null;
  boolean: boolean;
}

export type AttrValue =
  | { kind: 'static'; value: string }
  | { kind: 'hole'; hole: number }
  | { kind: 'mixed'; parts: ValuePart[] };

/** `.prop=${x}`: DOM property binding. */
export interface PropertyBindingNode extends NodeBase {
  kind: 'PropertyBinding';
  name: string;
  hole: number;
}

/**
 * `@click=${h}`, `onClick=${h}`, or `on:click=${h}`, with optional dotted
 * modifiers (`@click.capture.once`, `on:input.passive`). `syntax` is `'colon'`
 * for the `on:name` form (a native listener), `'at'` for `@name`, `'on'` for the
 * `onName` camelCase form.
 */
export interface EventBindingNode extends NodeBase {
  kind: 'EventBinding';
  /** Lowercased DOM event name (`click`). */
  name: string;
  syntax: 'at' | 'on' | 'colon';
  /** Dotted modifiers: capture/once/passive (listener options) + prevent/stop/self. */
  modifiers: string[];
  hole: number;
}

/** `ref=${el}`. */
export interface RefBindingNode extends NodeBase {
  kind: 'RefBinding';
  hole: number;
}

/** `...${props}`. */
export interface SpreadNode extends NodeBase {
  kind: 'Spread';
  hole: number;
}

/** `if=${cond}`. */
export interface IfDirectiveNode extends NodeBase {
  kind: 'IfDirective';
  hole: number;
}

/** `else` (valueless). */
export interface ElseDirectiveNode extends NodeBase {
  kind: 'ElseDirective';
}

/** `each=${items}` with optional `key="id"` / `key=${…}`. */
export interface EachDirectiveNode extends NodeBase {
  kind: 'EachDirective';
  hole: number;
  key: { static: string } | { hole: number } | null;
}

/** `bind:value=${signal}`. */
export interface BindDirectiveNode extends NodeBase {
  kind: 'BindDirective';
  name: string;
  hole: number;
}

/** `class:active=${flag}`. */
export interface ClassDirectiveNode extends NodeBase {
  kind: 'ClassDirective';
  name: string;
  hole: number;
}

/** `style:color=${c}`. */
export interface StyleDirectiveNode extends NodeBase {
  kind: 'StyleDirective';
  name: string;
  hole: number;
}

/**
 * `load:visible`, `load:interaction="click"`, …: when the component's module is
 * fetched.
 *
 * The node carries the strategy and its literal modifier as written; turning that into
 * a load plan is the compiler's job, so the parser stays free of module semantics , 
 * the same reason resolution has no syntax here either.
 */
export interface LoadDirectiveNode extends NodeBase {
  kind: 'LoadDirective';
  /** The part after `load:`, unvalidated: the compiler reports unknown strategies. */
  strategy: string;
  /** `load:visible="200px"` → `'200px'`. Null for a bare directive. */
  modifier: string | null;
}

/** `use=${directive}` or `use:tooltip` (optionally `use:tooltip=${opts}`). */
export interface UseDirectiveNode extends NodeBase {
  kind: 'UseDirective';
  /** Named form `use:tooltip` carries the name; bare `use=${d}` leaves it null. */
  name: string | null;
  hole: number | null;
}

/** `<slot>` element or `slot="name"` marker (reserved; wired in a later phase). */
export interface SlotNode extends NodeBase {
  kind: 'Slot';
  name: string | null;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  code: DiagnosticCode;
  message: string;
  severity: Severity;
  loc: SourceSpan;
}

export type DiagnosticCode =
  | 'unclosed-tag'
  | 'mismatched-close-tag'
  | 'stray-close-tag'
  | 'unclosed-comment'
  | 'duplicate-directive'
  | 'else-without-if'
  | 'invalid-directive'
  | 'invalid-binding'
  | 'unsupported-combination'
  // Accessibility. Warnings, never errors: they describe a barrier, not invalid
  // markup, and failing a build on them would be the wrong trade.
  | 'a11y-img-alt'
  | 'a11y-anchor-href'
  | 'a11y-iframe-title'
  | 'a11y-positive-tabindex'
  | 'a11y-click-without-keyboard';

/** The full result of a parse: the tree plus any recovered-from problems. */
export interface ParseResult {
  root: RootNode;
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Wire every node's `parent` pointer by walking the tree once. */
export function setParents(root: RootNode): RootNode {
  const visit = (node: TemplateNode, parent: TemplateNode | null): void => {
    node.parent = parent;
    const kids = childrenOf(node);
    for (const child of kids) visit(child, node);
  };
  visit(root, null);
  return root;
}

/** The content children of a node (attributes are not content children). */
export function childrenOf(node: TemplateNode): TemplateNode[] {
  switch (node.kind) {
    case 'Root':
    case 'Element':
    case 'Component':
    case 'Fragment':
      return node.children;
    default:
      return [];
  }
}
