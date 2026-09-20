/**
 * Compile-time component resolution.
 *
 * An unbound capitalised tag in a template is a name the compiler can resolve to a
 * module, instead of an import the author has to write. The framework already does
 * this for `Suspense`/`Portal`/`Router`, but through a hardcoded name set inside the
 * Babel plugin: which cannot be extended by a UI library or an app, and cannot be
 * configured per project.
 *
 * This is the configurable version of the same idea. It is deliberately a pure
 * `name -> { module, export }` function with no filesystem access and no Babel
 * dependency, because three separate consumers need exactly the same answer:
 *
 *   - the compiler, to inject the import;
 *   - the TS plugin, to synthesise the import so hover/go-to-definition/rename work;
 *   - a codemod, to materialise imports back into source.
 *
 * Keeping resolution pure is what lets those three agree. Anything requiring the
 * filesystem (directory conventions) belongs in a rule *builder* that produces a map,
 * not in the resolver itself.
 */

/** Where a resolved component comes from. */
export interface ResolvedComponent {
  module: string;
  /** The export name, or `default`. */
  export: string;
}

/**
 * An explicit name -> module map. This is what a component library ships
 * (`Button -> @fluixi-ui/button`), generated from its own package list rather than
 * hand-maintained.
 */
export interface ComponentMapRule {
  components: Record<string, string | ResolvedComponent>;
}

/**
 * A pattern rule. `$1`-style references in `module`/`export` are substituted from the
 * match groups, so one rule can cover a family (`Icon(.+) -> @/icons/$1`).
 */
export interface ComponentPatternRule {
  match: RegExp;
  module: string;
  /** Defaults to the tag name; use `'default'` for file-per-component layouts. */
  export?: string;
}

export type ComponentResolverRule = ComponentMapRule | ComponentPatternRule;

/** Two rules claiming the same name: reported rather than silently first-wins. */
export interface ResolverConflict {
  name: string;
  modules: string[];
}

export interface ComponentResolver {
  /** `undefined` when no rule claims the name. */
  resolve: (name: string) => ResolvedComponent | undefined;
  /** Every name the resolver can answer, for editor completion. */
  names: () => string[];
  /** Names claimed by more than one rule with different targets. */
  conflicts: () => ResolverConflict[];
}

const isMapRule = (rule: ComponentResolverRule): rule is ComponentMapRule =>
  'components' in rule;

/** Expand `$1`/`$2` against a regex match. */
function substitute(template: string, match: RegExpMatchArray): string {
  return template.replace(/\$(\d+)/g, (whole, index: string) => {
    const group = match[Number(index)];
    return group ?? whole;
  });
}

function normalise(name: string, entry: string | ResolvedComponent): ResolvedComponent {
  return typeof entry === 'string' ? { module: entry, export: name } : entry;
}

/**
 * Build a resolver from rules, in order.
 *
 * Map rules are flattened up front so lookup is a plain object read, resolution runs
 * once per component reference per compile, so it sits on the hot path of every build.
 * Pattern rules are tried afterwards, in declaration order, and only when no map rule
 * matched: an explicit entry should always beat a pattern.
 */
export function createComponentResolver(
  rules: readonly ComponentResolverRule[] = [],
): ComponentResolver {
  const exact = new Map<string, ResolvedComponent>();
  const conflicts: ResolverConflict[] = [];
  const patterns: ComponentPatternRule[] = [];

  for (const rule of rules) {
    if (!isMapRule(rule)) {
      patterns.push(rule);
      continue;
    }
    for (const [name, entry] of Object.entries(rule.components)) {
      const resolved = normalise(name, entry);
      const existing = exact.get(name);
      if (existing && existing.module !== resolved.module) {
        // Ambiguity is the failure mode that actually happens once a map holds
        // ~80 common words (Card, Table, Text, Link). Silently taking the first
        // rule would compile a working import of the wrong component, which is
        // far worse to debug than a build error: so it is recorded and reported.
        const conflict = conflicts.find((c) => c.name === name);
        if (conflict) conflict.modules.push(resolved.module);
        else conflicts.push({ name, modules: [existing.module, resolved.module] });
        continue;
      }
      exact.set(name, resolved);
    }
  }

  const cache = new Map<string, ResolvedComponent | undefined>();

  const resolve = (name: string): ResolvedComponent | undefined => {
    if (cache.has(name)) return cache.get(name);

    let result = exact.get(name);
    if (!result) {
      for (const rule of patterns) {
        // A fresh regex per test: a caller's `/g` pattern carries lastIndex between
        // calls, which would make resolution depend on how many names came before it.
        const match = name.match(new RegExp(rule.match.source, rule.match.flags.replace('g', '')));
        if (!match) continue;
        result = {
          module: substitute(rule.module, match),
          export: rule.export ? substitute(rule.export, match) : name,
        };
        break;
      }
    }

    cache.set(name, result);
    return result;
  };

  return {
    resolve,
    names: () => [...exact.keys()],
    conflicts: () => conflicts,
  };
}
