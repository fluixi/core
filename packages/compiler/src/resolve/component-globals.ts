/**
 * Ambient declarations for the components `resolve` supplies without an import.
 *
 * The compiler injects the import, so nothing in the source imports these, which leaves
 * TypeScript reporting `TS2304: Cannot find name`. The code compiles and runs; the editor
 * is unusable and `tsc` fails. These declarations describe what the compiler already
 * does. They do not enable it.
 *
 * This lives next to the resolver, and takes rules rather than a flat map, because the
 * resolver is the only thing that knows the whole picture: a UI library's components, the
 * project's own, and the framework builtins all arrive through the same config. A
 * component library cannot generate this on its own, it does not know what else the
 * project resolves: which is why the generator belongs here and the library-specific CLI
 * that predates it does not.
 *
 * Pure, like the resolver: rules in, source out, no filesystem. Writing the file is the
 * caller's job (the Vite plugin does it on config resolve; a CLI can do it in CI).
 */
import {
  createComponentResolver,
  type ComponentResolverRule,
  type ResolvedComponent,
} from './component-resolver.js';
import { builtinComponentMap } from './builtins.js';
import { INTRINSICS } from '../analyze/intrinsics.js';

/**
 * Names `lib.dom` already declares as globals.
 *
 * An ambient `const Text` cannot beat `lib.dom`'s `var Text`, so for these the editor
 * would disagree with the compiler: resolution still works at runtime, but the type
 * shown would be the DOM node's. They are left out and reported instead, since importing
 * them explicitly makes both agree.
 */
const DOM_GLOBALS = new Set([
  'Text',
  'Image',
  'Option',
  'Audio',
  'Comment',
  'Range',
  'Selection',
  'Notification',
  'Event',
  'Document',
  'Element',
  'Node',
  'Screen',
  'Window',
  'Location',
  'History',
  'Storage',
  'Response',
  'Request',
  'Headers',
]);

export interface ComponentGlobalsOptions {
  /**
   * Packages the project can actually resolve: normally its declared dependencies.
   *
   * Declaring a component from a package the project does not depend on produces an
   * unresolvable `import(...)`, and under the usual `skipLibCheck: true` that failure is
   * silent: the component degrades to `any` and every prop typo type-checks, which is
   * worse than the error it replaced. Omit to declare everything, which is only correct
   * when every package is present.
   *
   * Relative and alias specifiers are never filtered, there is no package to check.
   */
  available?: Iterable<string>;
  /**
   * Declare the framework builtins (`Show`, `For`, `Portal`, `Router`, …) too.
   *
   * On by default because the compiler resolves them whether or not a rule mentions
   * them, so declaring them is what matches reality. A real import shadows the ambient
   * declaration, so this stays safe for code that imports them explicitly.
   */
  builtins?: boolean;
  /**
   * Declare the `$` reactive intrinsics (`$signal`, `$memo`, …).
   *
   * On by default, matching the compiler: it rewrites those calls whether or not
   * anything declares them, and without the declaration the editor reports
   * "Cannot find name '$signal'" for code that builds correctly.
   */
  intrinsics?: boolean;
  /**
   * Names to try against the pattern rules.
   *
   * A pattern has no name list of its own, but the files it points at do: the caller lists
   * them (the generator stays off the filesystem) and each name the resolver answers is
   * declared like any other.
   */
  candidates?: Iterable<string>;
  /** Attribution written into the header. */
  generator?: string;
  /**
   * Rewrite a module specifier for the file being generated.
   *
   * A bundler and TypeScript do not agree on every specifier: Vite resolves a
   * root-absolute `/src/x.tsx` that TypeScript cannot see at all. The caller knows where
   * the file will land and so is the only one able to fix that up; the generator stays
   * pure and just asks.
   */
  specifier?: (module: string) => string;
}

export interface ComponentGlobalsResult {
  /** The `.d.ts` source to write. */
  source: string;
  /** Components declared. */
  declared: string[];
  /** Left out because `lib.dom` already claims the name. */
  shadowedByDom: string[];
  /** Left out because the project does not depend on their package. */
  unavailable: string[];
  /**
   * Pattern rules, which have no finite name list and so cannot be declared.
   *
   * `Icon(.+) -> @/icons/$1` matches unboundedly many names; the resolver answers them on
   * demand but cannot enumerate them. Those tags stay manual, and the caller is told how
   * many rules are in that position rather than left to wonder why nothing appeared.
   */
  patternRules: number;
}

/** The package a specifier belongs to, or undefined when it is not a package import. */
function packageOf(specifier: string): string | undefined {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return undefined;
  // Alias specifiers (`@/x`, `~/x`) are project-local and resolve through tsconfig paths.
  if (/^[~@]\//.test(specifier)) return undefined;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** A valid identifier for the namespace import of `module`. */
function namespaceAlias(module: string): string {
  return `_${module.replace(/[^A-Za-z0-9]/g, '_')}`;
}

/** Build the ambient `.d.ts` for the components a project's `resolve` config supplies. */
export function componentGlobals(
  rules: readonly ComponentResolverRule[],
  options: ComponentGlobalsOptions = {},
): ComponentGlobalsResult {
  const {
    available: availableList,
    builtins = true,
    intrinsics = true,
    generator = '@fluixi/compiler',
    specifier = (module: string) => module,
    candidates = [],
  } = options;

  const all: ComponentResolverRule[] = [...rules];
  if (builtins) {
    // Appended, so an explicit rule for the same name still wins, the resolver is
    // first-match, and a project retargeting `Router` should keep its own answer.
    all.push({ components: builtinComponentMap() });
  }

  const resolver = createComponentResolver(all);
  const available = availableList ? new Set(availableList) : undefined;

  const declared: string[] = [];
  const shadowedByDom: string[] = [];
  const unavailable: string[] = [];
  const resolved = new Map<string, ResolvedComponent>();

  const names = new Set([...resolver.names(), ...[...candidates].filter((n) => /^[A-Za-z_$][\w$]*$/.test(n))]);
  for (const name of [...names].sort()) {
    const target = resolver.resolve(name);
    if (!target) continue;

    const pkg = packageOf(target.module);
    if (DOM_GLOBALS.has(name)) shadowedByDom.push(name);
    else if (available && pkg && !available.has(pkg)) unavailable.push(name);
    else {
      declared.push(name);
      resolved.set(name, target);
    }
  }

  // The `$` intrinsics need declaring too, or the editor says "Cannot find name
  // '$signal'" for code that compiles. tsc doesn't load language-service plugins, so an
  // ambient declaration is the only thing that answers for both the editor and the
  // command line.
  // Only the intrinsics whose package the project has: `$env` comes from `@fluixi/start`, and
  // an app without it would otherwise get a declaration that fails to resolve.
  const usableIntrinsics = intrinsics
    ? Object.entries(INTRINSICS).filter(([, i]) => {
        const pkg = packageOf(i.module);
        return !available || !pkg || available.has(pkg);
      })
    : [];
  const intrinsicModules = [...new Set(usableIntrinsics.map(([, i]) => i.module))];
  const modules = [
    ...new Set([...declared.map((name) => resolved.get(name)!.module), ...intrinsicModules]),
  ].sort();
  const imports = modules.map(
    (m) => `import * as ${namespaceAlias(m)} from '${specifier(m)}';`,
  );

  // `export import X = ns.X` rather than `const X: typeof import('…').X`: an alias
  // resolves to the original symbol, so hover shows the real declaration
  // (`Button(props: ButtonProps): ComponentChild`) and go-to-definition lands on the
  // source. Both forms keep the JSDoc; the alias also keeps the shape.
  //
  // A default export cannot use it: `import X = ns.default` is a syntax error, since
  // `default` is a reserved word in that position, so those fall back to the `const`
  // form, which types and documents correctly but renders as an anonymous arrow.
  const lines = declared.map((name) => {
    const target = resolved.get(name)!;
    const ns = namespaceAlias(target.module);
    return target.export === 'default'
      ? `  const ${name}: typeof ${ns}.default;`
      : `  export import ${name} = ${ns}.${target.export};`;
  });

  const note =
    shadowedByDom.length > 0
      ? `//\n// Import these explicitly: lib.dom already declares the name, so an ambient\n` +
        `// declaration cannot win:\n` +
        shadowedByDom
          .map((n) => {
            const module = resolver.resolve(n)?.module;
            return `//   import { ${n} } from '${module ? specifier(module) : ''}';\n`;
          })
          .join('')
      : '';

  // `typeof ns.signal` rather than an alias: the intrinsic is a global that stands for
  // the runtime call, so it takes the runtime's signature without claiming to be that
  // symbol: go-to-definition on `$signal` should land on what it compiles to.
  const intrinsicLines = usableIntrinsics.map(
    ([name, intrinsic]) => `  const ${name}: typeof ${namespaceAlias(intrinsic.module)}.${intrinsic.export};`,
  );

  const patternRules = rules.filter((rule) => 'match' in rule).length;
  const patternNote =
    patternRules === 0
      ? ''
      : options.candidates
        ? `//\n// ${patternRules} pattern rule${patternRules === 1 ? '' : 's'}: declared for the files the module path\n` +
          `// points at. A name with no such file still resolves at build time; declare it by hand.\n`
        : `//\n// ${patternRules} pattern rule${patternRules === 1 ? '' : 's'} cannot be declared:\n` +
          `// a pattern matches unboundedly many names, so there is no list to emit. Those\n` +
          `// tags still resolve at build time; declare them by hand if the editor needs them.\n`;

  const source =
    `// GENERATED by ${generator}, do not edit.\n` +
    `//\n` +
    `// The components \`resolve\` supplies without an import. This describes what the\n` +
    `// compiler already does; it does not enable it.\n` +
    note +
    patternNote +
    (imports.length > 0 ? `\n${imports.join('\n')}\n` : '\n') +
    `\ndeclare global {\n${[...lines, ...intrinsicLines].join('\n')}\n}\n`;

  return { source, declared, shadowedByDom, unavailable, patternRules };
}
