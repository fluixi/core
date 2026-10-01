/** The prefix a namespace puts before its keys: `app` gives `app:`. */
export function namespacePrefix(namespace: string | undefined): string {
  return namespace ? `${namespace}:` : '';
}

/** A nested namespace: `app` and `auth` give `app:auth`. */
export function joinNamespace(parent: string | undefined, child: string): string {
  if (!child) throw new TypeError('A namespace needs a name.');
  return parent ? `${parent}:${child}` : child;
}
