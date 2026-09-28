/**
 * The same custom elements, used inside a Fluixi app.
 *
 * Props are passed as values (`step={2}` is a number, set as a property) and the elements'
 * `CustomEvent`s arrive in ordinary handlers, typed from each element's declaration. In dev,
 * the devtools graph shows each element as a `custom-element` group holding its props.
 */
import { signal } from '@fluixi/reactive/signal';

export default function App() {
  const lastChange = signal<number | null>(null);
  const limit = signal('');
  const submitted = signal('');

  const submit = (event: Event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    submitted.set(JSON.stringify(Object.fromEntries(data)));
  };

  return (
    <main class="demo">
      <h1>Custom elements in a Fluixi app</h1>

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
        <h2>Shadow DOM and slots</h2>
        <fx-disclosure>
          <span slot="summary">What is on this page?</span>
          <p>Four custom elements, rendered by a Fluixi app and upgraded in the browser.</p>
        </fx-disclosure>
      </section>
    </main>
  );
}
