/**
 * The public `createContext`: the runtime's, with a Provider that keeps plain function
 * children in its scope. The runtime Provider reads `children` under its own owner and
 * hands them back as they are. A child that is a memo (`<Show>`, `<For>`) captured that
 * owner, but a plain function child (`{() => (open() ? <Panel /> : null)}`) is run later by
 * whoever inserts it, outside the scope, and its components read the default.
 *
 * Each such child is handed back still a plain function, so it is inserted when and where
 * it was before (hydration adopts nodes in that order), but every run happens in a fresh
 * scope under the Provider, disposed before the next run as the inserting effect's own
 * children would be.
 */
import {
  createContext as createRuntimeContext,
  createChildOwner,
  disposeScope,
  getOwner,
  onCleanup,
  runWithOwner,
  type Context,
  type Owner,
} from './runtime.js';
import { isSignal } from './detect.js';

function scoped(child: () => unknown, provider: Owner): () => unknown {
  return () => {
    const scope = createChildOwner(provider);
    onCleanup(() => {
      disposeScope(scope);
      const owned = provider.owned;
      const at = owned ? owned.indexOf(scope) : -1;
      if (at >= 0) owned!.splice(at, 1);
    });
    return runWithOwner(scope, child);
  };
}

function bindChildren(children: unknown, provider: Owner): unknown {
  // A memo or signal keeps its own owner; a render prop (with arguments) is called by its parent.
  if (typeof children === 'function') {
    return isSignal(children) || children.length ? children : scoped(children as () => unknown, provider);
  }
  return Array.isArray(children) ? children.map((child) => bindChildren(child, provider)) : children;
}

export function createContext<T>(defaultValue?: T, name?: string): Context<T> {
  const context = createRuntimeContext(defaultValue, name);
  const provide = context.Provider;
  const Provider: Context<T>['Provider'] = (props) =>
    provide({
      get value() {
        return props.value;
      },
      get debug() {
        return props.debug;
      },
      // Read by the runtime Provider with its own scope current.
      get children() {
        const provider = getOwner();
        const children = props.children;
        return provider ? bindChildren(children, provider) : children;
      },
    });
  return { ...context, Provider };
}
