/**
 * The node-type names the parser-agnostic layer is allowed to branch on.
 *
 * `lower/`, `analyze/`, `optimize/`, `resolve/` and `codegen/` never import a
 * parser. They declare `interface Node { type: string }`, read `node.type`, and
 * ask the caller for an expression's source through `code(node)`. That makes the
 * layer parser-agnostic in architecture while leaving it coupled to one parser's
 * *vocabulary*: the spelling of those type names, which differs by dialect.
 *
 * Until this file existed the vocabulary was convention. Nothing wrote it down,
 * so a second front-end had no definition of done and the current one could add a
 * name without anyone noticing. It has grown from the 35 names counted in
 * COMPILER-AUDIT §14.3 to the 53 below.
 *
 * ## Dialects
 *
 * Babel is the reference spelling because the babel front-end is the reference
 * implementation. ESTree (acorn, oxc) collapses the literal family into `Literal`
 * and calls an object entry `Property`; SWC renames more widely and carries
 * `span` instead of `loc`. A second front-end is therefore an adapter: rename at
 * the boundary and supply `code(node)`, which a span-carrying parser does better
 * than babel, since it can slice the original text instead of reprinting it.
 *
 * ## The span convention
 *
 * Positions are read as `node.loc.start.line` (1-based) and
 * `node.loc.start.column` (0-based). Nothing in this layer reads byte offsets;
 * source text arrives through `code(node)`, so a front-end is free to back that
 * with offsets, a printer, or anything else.
 *
 * ## What this file does not cover
 *
 * Names, not field reads. `vocabulary.spec.ts` fails on a name that is not listed
 * here, which catches a front-end porting gap at the point it is introduced. It
 * cannot see that some branch started reading `node.optional`, and adding that
 * would mean tracking property access through the narrowed type, which the spec
 * deliberately does not attempt.
 */

/** Every front-end produces nodes of at least this shape. */
export interface Node {
  type: string;
  loc?: { start?: { line?: number; column?: number } };
  [field: string]: unknown;
}

export interface VocabularyEntry {
  /** The ESTree spelling, when acorn and oxc disagree with babel. */
  estree?: string;
  /** Why the name is here, where that is not obvious from the name. */
  note?: string;
}

/**
 * Names whose ESTree spelling differs. These are the porting hazards: a front-end
 * swap that misses one produces a layer that silently stops recognising a
 * construct rather than failing.
 */
export const DIALECT_DIVERGENT: Record<string, VocabularyEntry> = {
  StringLiteral: { estree: 'Literal' },
  NumericLiteral: { estree: 'Literal' },
  BooleanLiteral: { estree: 'Literal' },
  NullLiteral: { estree: 'Literal' },
  BigIntLiteral: { estree: 'Literal' },
  RegExpLiteral: { estree: 'Literal' },
  ObjectProperty: { estree: 'Property' },
};

/**
 * The ESTree spellings the layer already accepts alongside the babel ones.
 *
 * Three sites handle both today (`lower/jsx.ts`, `analyze/props-destructure.ts`,
 * `analyze/expr-shape.ts`) and three do not: `analyze/static-graph.ts` tests
 * `StringLiteral` at one site and `ObjectProperty` at two, with no `Literal` or
 * `Property` branch beside them. Those three are the known gap, and they are why
 * this file lists the pairs rather than assuming the layer is already portable.
 */
export const ESTREE_ALIASES: Record<string, VocabularyEntry> = {
  Literal: { note: 'ESTree collapses the babel literal family into this' },
  Property: { note: 'ESTree spelling of ObjectProperty' },
};

/** JSX. acorn-jsx keeps babel's names; SWC does not. */
export const JSX_NODES: Record<string, VocabularyEntry> = {
  JSXElement: {},
  JSXFragment: {},
  JSXOpeningElement: {},
  JSXAttribute: {},
  JSXSpreadAttribute: {},
  JSXSpreadChild: {},
  JSXExpressionContainer: {},
  JSXEmptyExpression: { note: 'an empty container, and a JSX comment' },
  JSXIdentifier: {},
  JSXMemberExpression: { note: 'a dotted tag, read through code()' },
  JSXNamespacedName: { note: 'carries the directive prefixes: use:, on:, class:' },
  JSXText: {},
};

/** Names spelled the same in babel and ESTree. */
export const SHARED_NODES: Record<string, VocabularyEntry> = {
  ArrayExpression: {},
  ArrayPattern: {},
  ArrowFunctionExpression: {},
  AssignmentExpression: {},
  AssignmentPattern: {},
  BinaryExpression: {},
  BlockStatement: {},
  CallExpression: {},
  CatchClause: { note: 'introduces a binding, so scope tracking has to see it' },
  ClassDeclaration: {},
  ClassExpression: {},
  ConditionalExpression: {},
  ExportDefaultDeclaration: {},
  ExportNamedDeclaration: {},
  FunctionDeclaration: {},
  FunctionExpression: {},
  Identifier: {},
  ImportDeclaration: {},
  ImportDefaultSpecifier: {},
  ImportNamespaceSpecifier: {},
  ImportSpecifier: {},
  LogicalExpression: {},
  MemberExpression: {},
  ObjectExpression: {},
  ObjectPattern: {},
  RestElement: {},
  SpreadElement: {},
  TaggedTemplateExpression: { note: 'html`` and svg``' },
  TemplateLiteral: {},
  UnaryExpression: {},
  UpdateExpression: {},
  VariableDeclarator: {},
};

/** Every name the parser-agnostic layer may branch on. */
export const VOCABULARY: Record<string, VocabularyEntry> = {
  ...DIALECT_DIVERGENT,
  ...ESTREE_ALIASES,
  ...JSX_NODES,
  ...SHARED_NODES,
};

/** The directories that must not branch on anything outside `VOCABULARY`. */
export const PARSER_AGNOSTIC_DIRS = ['lower', 'analyze', 'optimize', 'resolve', 'codegen'] as const;
