/**
 * The `load:` directive — when a component's code is fetched.
 *
 * Resolution decides *where* a component comes from; this decides *when*. They are
 * separate because they vary independently: the location of `<RevenueChart>` is the
 * same everywhere and belongs in config, while whether this particular usage should
 * wait for the viewport is a property of the usage. Fusing them — `<Chart lazy="./Chart">`
 * — was rejected for exactly that reason.
 *
 * `load:` joins the existing `use:`/`prop:`/`attr:`/`bool:` namespace, so it cannot
 * collide with a real prop and the parser already has a directive taxonomy to hang it on.
 *
 * One parser for both frontends. `load:visible` is already a valid `JSXNamespacedName`,
 * so JSX needs no parser change, and the html`` path produces a `LoadDirective` node —
 * but both funnel through {@link parseLoadDirective}, so the two syntaxes cannot drift.
 */

/** When a component's module is fetched. */
export type IRLoadStrategy =
  | { kind: 'eager' }
  | { kind: 'idle' }
  | { kind: 'visible'; rootMargin?: string }
  | { kind: 'interaction'; events: string[] }
  | { kind: 'media'; query: string }
  | { kind: 'never' };

/** Everything is eager unless a directive says otherwise. */
export const EAGER: IRLoadStrategy = { kind: 'eager' };

/** Events that trigger an `interaction` load when none are named. */
export const DEFAULT_INTERACTION_EVENTS = ['pointerdown', 'focusin', 'keydown'] as const;

const STRATEGIES = new Set(['eager', 'idle', 'visible', 'interaction', 'media', 'never']);

export class LoadDirectiveError extends Error {}

/** True for an attribute name in the `load:` namespace. */
export function isLoadDirective(name: string): boolean {
  return name.startsWith('load:');
}

/**
 * Parse `load:<strategy>` plus its optional value into a strategy.
 *
 * `value` is the attribute's literal text — `load:visible="200px"` — or null for a bare
 * directive. A `${…}` hole is rejected: the strategy has to be known at compile time
 * because it decides how the module is emitted, and a runtime value cannot.
 */
export function parseLoadDirective(name: string, value: string | null): IRLoadStrategy {
  const strategy = name.slice('load:'.length);

  if (!STRATEGIES.has(strategy)) {
    throw new LoadDirectiveError(
      `Unknown load strategy 'load:${strategy}'. Expected one of ${[...STRATEGIES].join(', ')}.`,
    );
  }

  switch (strategy) {
    case 'eager':
      return EAGER;
    case 'idle':
      return { kind: 'idle' };
    case 'never':
      return { kind: 'never' };
    case 'visible':
      // `load:visible="200px"` starts the fetch before the element reaches the
      // viewport, which is usually what you want — arriving exactly on intersection
      // means the user waits for the network.
      return value ? { kind: 'visible', rootMargin: value } : { kind: 'visible' };
    case 'interaction':
      return {
        kind: 'interaction',
        events: value ? splitEvents(value) : [...DEFAULT_INTERACTION_EVENTS],
      };
    case 'media':
      if (!value) {
        throw new LoadDirectiveError(
          `'load:media' needs a query, e.g. load:media="(min-width: 1024px)".`,
        );
      }
      return { kind: 'media', query: value };
    default:
      /* c8 ignore next */
      throw new LoadDirectiveError(`Unhandled load strategy '${strategy}'.`);
  }
}

function splitEvents(value: string): string[] {
  const events = value
    .split(/[\s,]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (events.length === 0) {
    throw new LoadDirectiveError(`'load:interaction' was given no event names.`);
  }
  return events;
}

/** True when the strategy means "not in the parent chunk". */
export function isDeferred(strategy: IRLoadStrategy): boolean {
  return strategy.kind !== 'eager' && strategy.kind !== 'never';
}

/** A stable key for grouping references that share a strategy. */
export function strategyKey(strategy: IRLoadStrategy): string {
  switch (strategy.kind) {
    case 'visible':
      return `visible:${strategy.rootMargin ?? ''}`;
    case 'interaction':
      return `interaction:${[...strategy.events].sort().join(',')}`;
    case 'media':
      return `media:${strategy.query}`;
    default:
      return strategy.kind;
  }
}
