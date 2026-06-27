/**
 * Curated snippets. Each runs the REAL @fluixi reactive core through the sandbox API:
 *   signal(value, label?)   → callable accessor; `s()` reads, `s.set(v)` / `s.set(p => …)` writes
 *   memo(fn, label?)        → derived, lazy, cached
 *   effect(fn, label?)      → re-runs when its reads change
 *   ui.{text,button,label,row} → tiny interactive preview helpers (each ui.text is a render-effect)
 * Labels become the node names in the graph inspector.
 */
export interface Example {
  name: string;
  blurb: string;
  code: string;
}

export const examples: Example[] = [
  {
    name: 'Counter',
    blurb: 'A signal, an effect. Click + watch the effect node pulse.',
    code: `const count = signal(0, 'count');

ui.row(
  ui.button('−', () => count.set(n => n - 1)),
  ui.text(() => count(), 'render'),
  ui.button('+', () => count.set(n => n + 1)),
);`,
  },
  {
    name: 'Derived',
    blurb: 'A memo derives from a signal; only it (and the view) recompute.',
    code: `const celsius = signal(21, 'celsius');
const fahrenheit = memo(() => celsius() * 9 / 5 + 32, 'fahrenheit');

ui.row(
  ui.button('−', () => celsius.set(c => c - 1)),
  ui.text(() => celsius() + '°C', 'C'),
  ui.button('+', () => celsius.set(c => c + 1)),
);
ui.row(ui.label('= '), ui.text(() => fahrenheit() + '°F', 'F'));`,
  },
  {
    name: 'Diamond (glitch-free)',
    blurb: "a → b,c → d. Bump a: d recomputes EXACTLY once, never with a torn value.",
    code: `const a = signal(1, 'a');
const b = memo(() => a() + 1, 'b');
const c = memo(() => a() * 2, 'c');
const d = memo(() => b() + c(), 'd');

let dRuns = 0;
const runs = signal(0, 'd.runs');
const sum = memo(() => { dRuns++; runs.set(dRuns); return d(); }, 'sum');

ui.row(ui.button('a += 1', () => a.set(n => n + 1)), ui.text(() => 'a=' + a(), 'a?'));
ui.row(ui.label('d = b + c = '), ui.text(() => sum(), 'd?'));
ui.row(ui.label('d recomputed '), ui.text(() => runs(), 'count'), ui.label(' times total'));`,
  },
  {
    name: 'Lazy memos',
    blurb: "Unobserved memos don't run. Toggle the view and watch the right half of the graph appear.",
    code: `const x = signal(2, 'x');
const cheap = memo(() => x() + 1, 'cheap');
const expensive = memo(() => cheap() * cheap(), 'expensive²');
const show = signal(false, 'show');

ui.row(
  ui.button('x += 1', () => x.set(n => n + 1)),
  ui.button('toggle view', () => show.set(s => !s)),
);
// 'expensive²' only computes while this view observes it — flip the toggle to see it light up.
ui.text(() => show() ? ('x²-ish = ' + expensive()) : '(hidden — memo stays lazy)', 'view');`,
  },
  {
    name: 'Fan-out',
    blurb: 'One source, many dependents — see propagation spread across the graph.',
    code: `const n = signal(3, 'n');
const sq = memo(() => n() * n(), 'n²');
const cube = memo(() => n() * n() * n(), 'n³');
const parity = memo(() => n() % 2 === 0 ? 'even' : 'odd', 'parity');
const summary = memo(() => \`\${n()} · sq=\${sq()} · cube=\${cube()} · \${parity()}\`, 'summary');

ui.row(ui.button('−', () => n.set(v => v - 1)), ui.text(() => n(), 'n'), ui.button('+', () => n.set(v => v + 1)));
ui.text(() => summary(), 'view');`,
  },
];
