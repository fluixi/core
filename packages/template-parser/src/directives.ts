/**
 * The directive registry — the extensibility seam.
 *
 * The core parser never hard-codes what `if`, `each`, `bind:value`, `@click`,
 * `.prop` etc. mean. It parses a raw `name[=value]` pair, then asks the registry
 * to turn it into a typed node. Adding future syntax is therefore a new
 * descriptor here (or registered by a downstream tool), never a change to the
 * parser's control flow. Descriptors are tried in order; the first whose
 * `match` returns true owns the attribute. Anything unmatched falls back to a
 * plain {@link AttributeNode}.
 */
import type {
  AttributeLikeNode,
  AttributeNode,
  AttrValue,
  BindDirectiveNode,
  ClassDirectiveNode,
  Diagnostic,
  DiagnosticCode,
  EachDirectiveNode,
  ElseDirectiveNode,
  EventBindingNode,
  IfDirectiveNode,
  PropertyBindingNode,
  RefBindingNode,
  SourceSpan,
  StyleDirectiveNode,
  UseDirectiveNode,
} from './ast.js';

/** Recognized event modifiers (`@click.capture.once`, `on:input.passive`, …). */
export const EVENT_MODIFIERS = new Set(['capture', 'once', 'passive', 'prevent', 'stop', 'self']);

/** A parsed-but-unclassified attribute handed to the registry. */
export interface RawAttribute {
  /** Name exactly as written (`class`, `@click`, `bind:value`, `?disabled`). */
  name: string;
  nameLoc: SourceSpan;
  /** null = valueless attribute. */
  value: AttrValue | null;
  loc: SourceSpan;
  /** Emit a located diagnostic from inside a descriptor. */
  report(code: DiagnosticCode, message: string): void;
}

export interface DirectiveDescriptor {
  /** Stable id (for docs/debugging). */
  id: string;
  /** DOM-only sugar (`if`/`each`/`class:`…) is ignored on component tags. */
  elementOnly?: boolean;
  match(name: string): boolean;
  build(raw: RawAttribute): AttributeLikeNode;
}

/** Where an attribute sits — a native element or a component tag. */
export interface AttrContext {
  component: boolean;
}

/** Pull the single hole out of a value, or report if the shape is wrong. */
function requireHole(raw: RawAttribute, what: string): number {
  if (raw.value && raw.value.kind === 'hole') return raw.value.hole;
  raw.report('invalid-binding', `${what} requires an expression value: ${raw.name}=\${…}`);
  // Recovery: -1 marks a missing hole so the tree stays well-formed.
  return -1;
}

const attribute = (raw: RawAttribute, boolean: boolean): AttributeNode => ({
  kind: 'Attribute',
  name: boolean ? raw.name.slice(1) : raw.name,
  value: raw.value,
  boolean,
  loc: raw.loc,
});

/**
 * The built-in directives. Order matters: prefix forms are matched before the
 * plain-attribute fallback. Downstream tools can prepend their own.
 */
export const CORE_DIRECTIVES: DirectiveDescriptor[] = [
  // Events: `@click=${h}`, `on:click=${h}` (native), `onClick=${h}`, each with
  // optional dotted modifiers (`@click.capture.once`, `on:input.passive`).
  {
    id: 'event',
    match: (n) => n[0] === '@' || n.startsWith('on:') || /^on[A-Z]/.test(n),
    build: (raw): EventBindingNode => {
      let syntax: EventBindingNode['syntax'];
      let rest: string;
      if (raw.name[0] === '@') { syntax = 'at'; rest = raw.name.slice(1); }
      else if (raw.name.startsWith('on:')) { syntax = 'colon'; rest = raw.name.slice(3); }
      else { syntax = 'on'; rest = raw.name.slice(2); }
      // Dotted modifiers apply to the @/on: forms; the camelCase name has no dots.
      // Lowercase the name so `onClick`, `@click` and `on:click` all yield `click`
      // — the AST documents this field as the DOM event name, and a consumer that
      // trusts that shouldn't have to know which spelling was written. (`syntax`
      // still records the spelling; the ts-plugin reads the written form from source.)
      const [raw_name, ...modifiers] = rest.split('.');
      const name = raw_name!.toLowerCase();
      for (const m of modifiers) {
        if (!EVENT_MODIFIERS.has(m)) {
          raw.report('invalid-directive', `Unknown event modifier ".${m}" — expected one of ${[...EVENT_MODIFIERS].join(', ')}`);
        }
      }
      return {
        kind: 'EventBinding',
        name,
        syntax,
        modifiers,
        hole: requireHole(raw, 'event binding'),
        loc: raw.loc,
      };
    },
  },
  // Two-way binding: `bind:value=${signal}`.
  {
    id: 'bind',
    elementOnly: true,
    match: (n) => n.startsWith('bind:'),
    build: (raw): BindDirectiveNode => ({
      kind: 'BindDirective',
      name: raw.name.slice('bind:'.length),
      hole: requireHole(raw, 'two-way binding'),
      loc: raw.loc,
    }),
  },
  // Dynamic class toggle: `class:active=${flag}`.
  {
    id: 'class-directive',
    elementOnly: true,
    match: (n) => n.startsWith('class:'),
    build: (raw): ClassDirectiveNode => ({
      kind: 'ClassDirective',
      name: raw.name.slice('class:'.length),
      hole: requireHole(raw, 'class directive'),
      loc: raw.loc,
    }),
  },
  // Dynamic style: `style:color=${c}`.
  {
    id: 'style-directive',
    elementOnly: true,
    match: (n) => n.startsWith('style:'),
    build: (raw): StyleDirectiveNode => ({
      kind: 'StyleDirective',
      name: raw.name.slice('style:'.length),
      hole: requireHole(raw, 'style directive'),
      loc: raw.loc,
    }),
  },
  // Custom directive: `use=${d}` or `use:tooltip[=${opts}]`.
  {
    id: 'use',
    match: (n) => n === 'use' || n.startsWith('use:'),
    build: (raw): UseDirectiveNode => {
      const named = raw.name.startsWith('use:');
      return {
        kind: 'UseDirective',
        name: named ? raw.name.slice('use:'.length) : null,
        hole: raw.value && raw.value.kind === 'hole' ? raw.value.hole : null,
        loc: raw.loc,
      };
    },
  },
  // Conditional rendering: `if=${cond}`.
  {
    id: 'if',
    elementOnly: true,
    match: (n) => n === 'if',
    build: (raw): IfDirectiveNode => ({
      kind: 'IfDirective',
      hole: requireHole(raw, 'if directive'),
      loc: raw.loc,
    }),
  },
  // Loop rendering: `each=${items}` (a sibling `key` folds in at parse time).
  {
    id: 'each',
    elementOnly: true,
    match: (n) => n === 'each',
    build: (raw): EachDirectiveNode => ({
      kind: 'EachDirective',
      hole: requireHole(raw, 'each directive'),
      key: null,
      loc: raw.loc,
    }),
  },
  // `else` (valueless).
  {
    id: 'else',
    elementOnly: true,
    match: (n) => n === 'else',
    build: (raw): ElseDirectiveNode => {
      if (raw.value !== null) raw.report('invalid-directive', '`else` takes no value');
      return { kind: 'ElseDirective', loc: raw.loc };
    },
  },
  // Ref binding: `ref=${el}`.
  {
    id: 'ref',
    match: (n) => n === 'ref',
    build: (raw): RefBindingNode => ({
      kind: 'RefBinding',
      hole: requireHole(raw, 'ref binding'),
      loc: raw.loc,
    }),
  },
  // Property binding: `.currentTime=${t}`.
  {
    id: 'property',
    match: (n) => n[0] === '.',
    build: (raw): PropertyBindingNode => ({
      kind: 'PropertyBinding',
      name: raw.name.slice(1),
      hole: requireHole(raw, 'property binding'),
      loc: raw.loc,
    }),
  },
  // Boolean attribute (lit `?disabled`): a plain attribute flagged boolean.
  {
    id: 'boolean',
    match: (n) => n[0] === '?',
    build: (raw) => attribute(raw, true),
  },
];

/**
 * Resolve a raw attribute to a typed node using `directives` (defaults to the
 * core set). `each`/`key` are handled by the parser afterward because `key` is
 * a sibling attribute that folds into the preceding `each` node.
 */
export function resolveAttribute(
  raw: RawAttribute,
  directives: DirectiveDescriptor[] = CORE_DIRECTIVES,
  ctx: AttrContext = { component: false },
): AttributeLikeNode {
  for (const d of directives) {
    if (d.elementOnly && ctx.component) continue; // sugar is DOM-only
    if (d.match(raw.name)) return d.build(raw);
  }
  return attribute(raw, false);
}

export type { Diagnostic };
