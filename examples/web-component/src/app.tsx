/**
 * The same custom elements, used inside a Fluixi app.
 *
 * Props are passed as values (`step={2}` is a number, set as a property) and the elements'
 * `CustomEvent`s arrive in ordinary handlers, typed from each element's declaration. In dev,
 * the devtools graph shows each element as a `custom-element` group holding its props.
 */
import { composeProviders, requireContext } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { Accent, Theme, type ThemeName } from './context.js';
// Imported where they are used, like any component. Each file registers its element.
import './elements/counter.js';
import './elements/bounded-counter.js';
import './elements/rating.js';
import './elements/disclosure.js';
import './elements/tabs.js';

/** Reads the theme the app provides; throws if rendered outside the providers. */
function ThemeLabel() {
  const theme = requireContext(Theme);
  return <strong>{() => theme()}</strong>;
}

export default function App() {
  // The context default is light, the app starts dark: an element drawn dark after load got
  // its theme from here, through hydration.
  const theme = signal<ThemeName>('dark');
  const accent = signal('#16a34a');
  const tab = signal('provide');
  const lastChange = signal<number | null>(null);
  const limit = signal('');
  const submitted = signal('');

  const submit = (event: Event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    submitted.set(JSON.stringify(Object.fromEntries(data)));
  };

  return composeProviders([[Theme, () => theme], [Accent, () => accent]], {
    get children() {
      return (
    <main class="demo">
      <h1>Custom elements in a Fluixi app</h1>

      <section>
        <h2>Context from the app</h2>
        <div class="controls">
          <button onClick={() => theme.set(theme() === 'dark' ? 'light' : 'dark')}>Toggle theme</button>
          <label>
            Accent <input type="color" value={accent()} onInput={(e) => accent.set((e.target as HTMLInputElement).value)} />
          </label>
          <span>
            Theme: <ThemeLabel />
          </span>
        </div>
      </section>

      <section>
        <h2>A class element</h2>
        <fx-counter step={2} label="Clicks" onChange={(e) => lastChange.set(e.detail.value)} />
        <p>
          Last <code>change</code> event: {() => lastChange() ?? 'none yet'}
        </p>
      </section>

      <section>
        <h2>A subclass</h2>
        <fx-bounded-counter max={5} label="Up to 5" onLimit={(e) => limit.set(`stopped at ${e.detail.max}`)} />
        <p>{() => limit()}</p>
      </section>

      <section>
        <h2>A form control</h2>
        <form onSubmit={submit}>
          <fx-rating name="score" required label="How was it?" />
          <input name="comment" placeholder="A comment" />
          <button type="submit">Send</button>
          <button type="reset">Reset</button>
        </form>
        <pre>{() => submitted() || 'Submit the form to see what it sends.'}</pre>
      </section>

      <section>
        <h2>Context between elements</h2>
        <fx-tabs selected="provide" onChange={(e) => tab.set(e.detail.selected)}>
          <fx-tab name="provide" label="Provide">
            <p><code>fx-tabs</code> provides the selection.</p>
          </fx-tab>
          <fx-tab name="consume" label="Consume">
            <p>Each <code>fx-tab</code> consumes it.</p>
          </fx-tab>
          <fx-tab name="app" label="From the app">
            <p>
              Theme here: <ThemeLabel />
            </p>
          </fx-tab>
        </fx-tabs>
        <p>
          Selected: <code>{() => tab()}</code>
        </p>
      </section>

      <section>
        <h2>Shadow DOM and slots</h2>
        <fx-disclosure>
          <span slot="summary">What is on this page?</span>
          <p>Four custom elements, rendered by a Fluixi app and upgraded in the browser.</p>
        </fx-disclosure>
      </section>
    </main>
      );
    },
  });
}
