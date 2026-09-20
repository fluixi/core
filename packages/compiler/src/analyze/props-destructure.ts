/**
 * Props destructuring, without losing reactivity.
 *
 * Props come in as an object of getters, so `props.name` re-reads every time and that
 * keeps a binding current. `const { name } = props` copies the value out once, which is
 * why we call splitProps in about 84 components.
 *
 * The plan here rewrites `name` to `props.name` at each use rather than making it an
 * accessor. `() => props.name` would change the binding's type, and then every use has
 * to change with it: passed to a plain function, stored in an array, compared with
 * `===`. That's a whole-program job. Substitution is one function body and a rename.
 *
 * It does change one thing. A read that happens later sees the current value instead of
 * the value at destructure time, which is the reason to do this at all. Anything past
 * that I leave as written and report, so splitProps stays correct where it's still the
 * right answer.
 *
 * No babel in here (see no-babel-in-core.spec.ts), nodes are read structurally, the way
 * transform/bindings.ts does, so either front-end can drive it.
 */

interface Node {
  type: string;
  [key: string]: unknown;
}

/** Why a binding was left alone. All of these change more than when the read happens. */
export type DestructureBail =
  /**
   * A rest we can't serve: destructured further (`...{ a }`), or in a function with no
   * block to put the splitProps call in (`({ a, ...rest }) => …`).
   */
  | 'rest'
  /** `const { [key]: a } = props`: we don't know the property until it runs. */
  | 'computed'
  /** The binding gets assigned to, and props are read-only, so it can't become a member. */
  | 'reassigned'
  /** An inner scope binds the same name, so a use site could mean either one. */
  | 'shadowed'
  /**
   * A default we can't re-run on every read: a function hands out a new identity each
   * time, a call runs its side effect each time.
   */
  | 'unsafe-default';

export interface PropsRead {
  /** The local name the pattern introduced. */
  name: string;
  /** Property path to read through instead: `['user', 'name']` for `{ user: { name } }`. */
  path: string[];
  /**
   * Default from the pattern. JS only applies one for `undefined`, not for null, so
   * codegen has to test `=== undefined` rather than reach for `??`, and re-run it on
   * every read.
   */
  fallback?: Node;
}

export interface DestructurePlan {
  /** Bindings we can rewrite to a property read. */
  reads: PropsRead[];
  /** Bindings we left alone, with the reason to report. */
  bails: { name: string; reason: DestructureBail }[];
  /**
   * A `...rest`, and the keys it has to exclude.
   *
   * This is what splitProps is for: it copies the getters across rather than reading
   * them, which is the reason a plain `...rest` can't be rewritten. So instead of
   * refusing the pattern, we write the splitProps call the author would have written.
   */
  rest?: { name: string; keys: string[] };
}

/** Every name a pattern introduces, so we can check each one for shadowing and writes. */
function patternNames(node: Node | null | undefined, out: Set<string>): void {
  if (!node) return;
  switch (node.type) {
    case 'Identifier':
      out.add(node.name as string);
      return;
    case 'ObjectPattern':
      for (const p of node.properties as Node[]) {
        if (p.type === 'RestElement') patternNames(p.argument as Node, out);
        else patternNames(p.value as Node, out);
      }
      return;
    case 'ArrayPattern':
      for (const e of node.elements as (Node | null)[]) patternNames(e, out);
      return;
    case 'AssignmentPattern':
      patternNames(node.left as Node, out);
      return;
    case 'RestElement':
      patternNames(node.argument as Node, out);
      return;
  }
}

/**
 * Defaults get re-run on every read now, so they have to be cheap and stable. Literals
 * and identifiers are. A function isn't: it hands out a new identity each read, which
 * breaks anything comparing props: and neither is a call.
 */
function isSafeDefault(node: Node): boolean {
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'BigIntLiteral':
    case 'RegExpLiteral':
    case 'Identifier':
      return true;
    // ESTree spells every literal as `Literal`; both shapes reach this analysis.
    case 'Literal':
      return true;
    case 'TemplateLiteral':
      return (node.expressions as Node[]).every(isSafeDefault);
    case 'UnaryExpression':
      return isSafeDefault(node.argument as Node);
    case 'MemberExpression':
      // Could be a getter, and we'd be running it on every read.
      return false;
    default:
      return false;
  }
}

/** Walk everything under `root`. No visitor API here, so it's hand-rolled. */
function walk(root: Node | null | undefined, visit: (node: Node) => void): void {
  if (!root || typeof root !== 'object') return;
  visit(root);
  for (const key of Object.keys(root)) {
    if (key === 'loc' || key === 'range' || key === 'leadingComments' || key === 'trailingComments') continue;
    const value = (root as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item === 'object') walk(item as Node, visit);
    } else if (value && typeof value === 'object' && typeof (value as Node).type === 'string') {
      walk(value as Node, visit);
    }
  }
}

/** Anything written to in the body: `name = x`, `name++`, `[name] = …`. */
function reassignedNames(body: Node | null | undefined): Set<string> {
  const written = new Set<string>();
  walk(body, (node) => {
    if (node.type === 'AssignmentExpression') patternNames(node.left as Node, written);
    else if (node.type === 'UpdateExpression') {
      const arg = node.argument as Node;
      if (arg?.type === 'Identifier') written.add(arg.name as string);
    }
  });
  return written;
}

/** Names an inner scope re-binds, where a use site would mean something else. */
function shadowedNames(body: Node | null | undefined, candidates: Set<string>): Set<string> {
  const shadowed = new Set<string>();
  const note = (node: Node | null | undefined) => {
    const names = new Set<string>();
    patternNames(node, names);
    for (const n of names) if (candidates.has(n)) shadowed.add(n);
  };

  walk(body, (node) => {
    switch (node.type) {
      case 'VariableDeclarator':
        note(node.id as Node);
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        note(node.id as Node);
        for (const p of (node.params as Node[]) ?? []) note(p);
        return;
      case 'CatchClause':
        note(node.param as Node);
        return;
      case 'ClassDeclaration':
      case 'ClassExpression':
        note(node.id as Node);
        return;
    }
  });
  return shadowed;
}

/** One level of an object pattern, recursing into nested ones. */
function collect(pattern: Node, path: string[], plan: DestructurePlan): void {
  for (const property of (pattern.properties as Node[]) ?? []) {
    if (property.type === 'RestElement') {
      const argument = property.argument as Node;
      // Only a plain name. `...{ a }` would need its own splitProps and its own rules.
      if (argument?.type !== 'Identifier' || path.length > 0) {
        const names = new Set<string>();
        patternNames(argument, names);
        for (const name of names) plan.bails.push({ name, reason: 'rest' });
        continue;
      }
      plan.rest = { name: argument.name as string, keys: [] };
      continue;
    }

    if (property.computed) {
      const names = new Set<string>();
      patternNames(property.value as Node, names);
      for (const name of names) plan.bails.push({ name, reason: 'computed' });
      continue;
    }

    const key = property.key as Node;
    const propertyName = (key.type === 'Identifier' ? key.name : (key as { value?: unknown }).value) as string;
    let value = property.value as Node;
    let fallback: Node | undefined;

    if (value.type === 'AssignmentPattern') {
      fallback = value.right as Node;
      value = value.left as Node;
    }

    const here = [...path, propertyName];

    if (value.type === 'Identifier') {
      if (fallback && !isSafeDefault(fallback)) {
        plan.bails.push({ name: value.name as string, reason: 'unsafe-default' });
        continue;
      }
      plan.reads.push({ name: value.name as string, path: here, ...(fallback ? { fallback } : {}) });
      continue;
    }

    if (value.type === 'ObjectPattern') {
      // `{ user: { name } = {} }` would have to build the default object on every read.
      if (fallback) {
        const names = new Set<string>();
        patternNames(value, names);
        for (const name of names) plan.bails.push({ name, reason: 'unsafe-default' });
        continue;
      }
      collect(value, here, plan);
      continue;
    }

    // An array pattern indexes into a value we can't prove is stable, so leave it.
    const names = new Set<string>();
    patternNames(value, names);
    for (const name of names) plan.bails.push({ name, reason: 'computed' });
  }
}

/**
 * Plan one props pattern. `pattern` is the ObjectPattern, `body` the function body its
 * bindings live in. Every binding ends up in `reads` (rewrite it) or `bails` (leave it
 * and say why).
 */
export function planPropsDestructure(pattern: Node, body: Node | null | undefined): DestructurePlan {
  const plan: DestructurePlan = { reads: [], bails: [] };
  if (pattern?.type !== 'ObjectPattern') return plan;

  collect(pattern, [], plan);

  if (plan.rest) {
    // The splitProps call is a statement, so there has to be somewhere to put it.
    if (body?.type !== 'BlockStatement') {
      plan.bails.push({ name: plan.rest.name, reason: 'rest' });
      delete plan.rest;
    } else {
      // Keys the rest has to exclude: every top-level property the pattern names.
      plan.rest.keys = ((pattern.properties as Node[]) ?? [])
        .filter((p) => p.type !== 'RestElement' && !p.computed)
        .map((p) => {
          const key = p.key as Node;
          return (key.type === 'Identifier' ? key.name : (key as { value?: unknown }).value) as string;
        });
    }
  }

  if (plan.reads.length === 0 && !plan.rest) return plan;

  const candidates = new Set(plan.reads.map((r) => r.name));
  if (plan.rest) candidates.add(plan.rest.name);
  const written = reassignedNames(body);
  const shadowed = shadowedNames(body, candidates);

  const kept: PropsRead[] = [];
  for (const read of plan.reads) {
    if (written.has(read.name)) plan.bails.push({ name: read.name, reason: 'reassigned' });
    else if (shadowed.has(read.name)) plan.bails.push({ name: read.name, reason: 'shadowed' });
    else kept.push(read);
  }
  plan.reads = kept;

  // The rest binding is declared by the code we emit, so it has to survive the same
  // checks: reassigning it or shadowing the name would break what we wrote.
  if (plan.rest && written.has(plan.rest.name)) {
    plan.bails.push({ name: plan.rest.name, reason: 'reassigned' });
    delete plan.rest;
  } else if (plan.rest && shadowed.has(plan.rest.name)) {
    plan.bails.push({ name: plan.rest.name, reason: 'shadowed' });
    delete plan.rest;
  }

  return plan;
}

/** Reason text for the diagnostic. */
export function explainBail(reason: DestructureBail): string {
  switch (reason) {
    case 'rest':
      return 'this rest element cannot be served by splitProps, and copying the props into a plain object would lose the getters';
    case 'computed':
      return 'the property is not known until it runs';
    case 'reassigned':
      return 'the binding is assigned to, and props are read-only';
    case 'shadowed':
      return 'an inner scope binds the same name';
    case 'unsafe-default':
      return 'the default would have to run again on every read';
  }
}
