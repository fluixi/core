import { createSignal, createResource, type Component } from 'fluixi';
import { html } from 'fluixi';

// A single-file tour of every html`` template feature. Control-flow tags
// (Show/For/Index/Switch/Match/Portal/ErrorBoundary from @fluixi/dom, Suspense
// from fluixi) are ALL auto-imported by the compiler. Read props as
// `props.x` — never destructure (props are getters; destructuring freezes them).

// ── A component with a named slot ────────────────────────────────────────────
// `<Card><span slot="header">…</span>body</Card>` → props.header + props.children.
function Card(props: { header?: unknown; children?: unknown }) {
  return html`<div class="box"><strong>${props.header}</strong> — ${props.children}</div>`;
}

// ── A custom `use:` directive: focus the element on mount ───────────────────
function autofocus(el: HTMLElement) {
  queueMicrotask(() => el.focus?.());
}

// ── Async child for <Suspense> (guarded read → hydrates/render clean) ───────
function AsyncName() {
  const [user] = createResource(() => new Promise<string>((r) => setTimeout(() => r('async value'), 300)));
  const label = () => (user.loading ? 'loading…' : user());
  return html`<span class="tag">${label()}</span>`;
}


export const App: Component<{ name?: string}> = (props) => {
  const [count, setCount] = createSignal(0);
  const name = createSignal('world'); // [get, set] tuple for bind:
  const checked = createSignal(true);
  const [on, setOn] = createSignal(false);
  const [color, setColor] = createSignal('#8ab4f8');
  const [mode, setMode] = createSignal<'a' | 'b' | 'c'>('a');
  // A reactive list: `count` how many of the 3 items to show (starts at 3).
  const ALL = [
    { id: 1, label: 'alpha' },
    { id: 2, label: 'beta' },
    { id: 3, label: 'gamma' },
  ];
  const [shown, setShown] = createSignal(3);
  const items = () => ALL.slice(0, shown());
  const spreadAttrs = { title: 'via spread', 'data-demo': 'yes' };
  const markup = () => `<em>raw &lt;b&gt; ${count()}</em>`;
  
  let inputEl: HTMLInputElement | undefined;
  
  return html`
    <main>
      <h1>Fluixi · <code>html\`\`</code> feature showcase</h1>
  
      <!-- text + interpolation + mixed attribute -->
      <section>
        <h2>text &amp; interpolation</h2>
        <p class="box tone-${on() ? 'on' : 'off'}">count is <strong>${count()}</strong></p>
      </section>
  
      <!-- events: delegated, native, modifiers -->
      <section>
        <h2>events + modifiers</h2>
        <div class="row">
          <button @click=${() => setCount(count() + 1)}>@click +1</button>
          <button onClick=${() => setCount(count() - 1)}>onClick -1</button>
          <button on:click=${() => setCount(0)}>on:click reset (native)</button>
          <button @click.once=${() => setCount((c) => c + 100)}>@click.once +100</button>
          <a href="#" @click.prevent.stop=${() => setCount((c) => c + 1)}>@click.prevent.stop</a>
        </div>
      </section>
  
      <!-- attributes: boolean, property, ref, spread -->
      <section>
        <h2>attributes: ?bool · .prop · ref · spread</h2>
        <div class="row">
          <button ?disabled=${count() < 0}>?disabled when negative</button>
          <progress .value=${Math.abs(count()) % 100} max="100"></progress>
          <input ref=${(el) => (inputEl = el)} use=${autofocus} placeholder="ref + use:autofocus" />
          <span class="tag" ...${spreadAttrs}>spread</span>
        </div>
      </section>
  
      <!-- two-way binding -->
      <section>
        <h2>bind:value / bind:checked</h2>
        <div class="row">
          <input bind:value=${name} placeholder="type…" />
          <span>hello, <strong>${name[0]()}</strong></span>
          <label><input type="checkbox" bind:checked=${checked} /> checked: ${checked[0]() ? 'yes' : 'no'}</label>
        </div>
      </section>
  
      <!-- reactive class/style: directives + object syntax -->
      <section>
        <h2>class: / style: + object syntax</h2>
        <div class="row">
          <button @click=${() => setOn(!on())}>toggle</button>
          <span class="box" class:active=${on()} style:color=${color()}>directives</span>
          <span class="box" class=${{ active: on(), danger: count() < 0 }} style=${{ color: color(), fontWeight: 'bold' }}>objects</span>
          <input type="color" bind:value=${[color, setColor] as const} />
        </div>
      </section>
  
      <!-- raw html -->
      <section>
        <h2>raw html (innerHTML)</h2>
        <div class="box" html=${markup()}></div>
      </section>
  
      <!-- conditional: if / else -->
      <section>
        <h2>if / else</h2>
        <p if=${count() > 0} class="box">positive: ${count()}</p>
        <p else class="box">zero or negative</p>
      </section>
  
      <!-- list: each (unkeyed → plain item value) -->
      <section>
        <h2>each — reactive list (${shown()} of ${ALL.length})</h2>
        <div class="row">
          <button @click=${(e) => setShown(Math.max(0, shown() - 1))}>fewer</button>
          <button @click=${() => setShown(Math.min(ALL.length, shown() + 1))}>more</button>
        </div>
        <ul>
          <li each=${items()}>${(it) => it.label}</li>
        </ul>
        <!-- keyed variant: <li each=${items()} key="id"> — then the render fn
             receives an ACCESSOR: ${(it) => it().label} -->
      </section>
  
      <!-- control flow components -->
      <section>
        <h2>control flow: Show / For / Switch / Suspense / Portal</h2>
        <Show when=${on()} fallback=${html`<span class="tag">Show: off</span>`}>
          <span class="tag active">Show: on</span>
        </Show>
        <For each=${items()}>${(it) => html`<span class="tag">${it.label}</span>`}</For>
        <div class="row">
          <button @click=${() => setMode(mode() === 'a' ? 'b' : mode() === 'b' ? 'c' : 'a')}>mode: ${mode()}</button>
          <Switch fallback=${html`<span class="tag">?</span>`}>
            <Match when=${mode() === 'a'}><span class="tag">A</span></Match>
            <Match when=${mode() === 'b'}><span class="tag">B</span></Match>
          </Switch>
        </div>
        <Suspense fallback=${html`<span class="tag">suspending…</span>`}>
          <AsyncName />
        </Suspense>
        <Portal mount=${document.body}>
          <div class="tag" style="position:fixed;bottom:8px;right:8px">portal → body</div>
        </Portal>
      </section>
  
      <!-- components + named slots -->
      <section>
        <h2>components + named slots</h2>
        <Card header><span slot="header">Header slot</span><em>default child</em></Card>
      </section>
  
      <!-- svg (namespaced) -->
      <section>
        <h2>svg</h2>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r=${10 + (Math.abs(count()) % 20)} fill=${color()} />
        </svg>
      </section>
  
      <!-- fragment -->
      <>
        <hr />
        <small>Every binding above is compiled to @fluixi/dom calls — no lit runtime.</small>
      </>
    </main>
  `;
};
