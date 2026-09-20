import { Chart } from './components/Chart';
import { Legend } from './components/Legend';

/**
 * Two components, imported the same way, with the same kind of `load:` directive. Only
 * one of them ends up in its own chunk.
 *
 * Deferring a component means replacing your static import with a dynamic one. The
 * compiler will only do that when the name is used *nowhere but as a tag*, a JSX tag
 * name is a `JSXIdentifier`, so "no `Identifier` references anywhere" is an exact test
 * rather than a guess.
 *
 * `Chart` passes it. `Legend` does not: the lookup below mentions it as a value, and
 * handing that a lazy wrapper instead of the real component would change what it holds.
 * So `Legend` keeps its import, ships in the entry chunk, and the compiler says so at
 * build time rather than leaving you to find it in a network panel.
 */

/** A plain value reference: this is the whole reason `Legend` cannot be deferred. */
const widgets = { legend: Legend };

export function App() {
  return (
    <main>
      <h1>load: on your own imports</h1>

      {/* Only ever a tag → the import is rewritten into a deferred binding. */}
      <Chart load:visible="200px" />

      {/* Also a value → the import stays, and the build warns. */}
      <Legend load:idle />

      <p class="widgets">{Object.keys(widgets).join(',')}</p>
    </main>
  );
}
