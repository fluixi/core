// `@babel/core` for the browser.
//
// @fluixi/compiler takes @babel/core as an optional peer — the babel frontend is opt-in, and
// whoever uses it supplies the babel. In a page that has to be @babel/standalone; resolving the
// real one drags Node's `path` in, which Vite externalises with a warning and which would fail
// the moment anything touched it.
//
// standalone keeps the pieces under `.packages` rather than at the top level, so this maps the
// names the plugin imports onto them. Aliased in vite.config.ts.
import * as standalone from '@babel/standalone';

interface StandalonePackages {
  types: unknown;
  traverse: unknown;
  template: unknown;
  parser: unknown;
  generator: unknown;
}

const packages = (standalone as unknown as { packages: StandalonePackages }).packages;

// `traverse` and `template` are namespaces whose callable is `.default`; `types` and `parser`
// are the objects themselves. Importing the namespace where a function is expected is what
// produced "traverse is not a function".
const callable = <T>(mod: T): T => ((mod as { default?: unknown })?.default ?? mod) as T;

export const types = packages.types;
export const parser = packages.parser;
export const traverse = callable(packages.traverse);
export const template = callable(packages.template);

/** standalone's transform is already synchronous; the name is what the plugin imports. */
export const transformSync = (standalone as unknown as { transform: unknown }).transform;
export const transform = transformSync;

export default standalone;
