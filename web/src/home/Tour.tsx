import { For, Show, memo, onCleanup, signal } from '@fluixi/core';
import { COMPILED, TABS, tokenize, type Token } from './tour-content.js';
import './tour.css';

const SKINS = ['Soft', 'Material', 'Paper', 'Glass'] as const;
type Skin = (typeof SKINS)[number];

function CodeView(props: { code: string; small?: boolean }) {
  const rows = memo(() => tokenize(props.code));
  return (
    <div class={props.small ? 'tour-code small' : 'tour-code'}>
      <For each={rows()}>
        {(row: Token[]) => (
          <div>
            <For each={row}>{(t: Token) => <span class={t.kind ? `tk-${t.kind}` : undefined}>{t.text}</span>}</For>
          </div>
        )}
      </For>
    </div>
  );
}

function Counter() {
  const count = signal(0);
  const lit = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  const click = () => {
    count.set((c) => c + 1);
    lit.set(true);
    clearTimeout(timer);
    timer = setTimeout(() => lit.set(false), 700);
  };
  return (
    <div class="tour-live">
      <button type="button" class="tour-counter" onClick={click}>
        Clicked <span classList={{ on: lit() }}>{count()}</span> times
      </button>
      <div class="tour-graph" aria-hidden="true">
        <span classList={{ node: true, on: lit() }}>count</span>
        <span class="edge">→</span>
        <span classList={{ node: true, on: lit() }}>text: count()</span>
      </div>
      <p class="tour-note">Each click reaches one signal and one text node.</p>
    </div>
  );
}

function FormPreview() {
  return (
    <div class="tour-sample">
      <label for="tour-email">Email</label>
      <input id="tour-email" type="email" value="ada@" aria-invalid="true" aria-describedby="tour-email-error" />
      <span id="tour-email-error" class="tour-error">Enter a valid email address.</span>
    </div>
  );
}

function SkinsPreview() {
  const skin = signal<Skin>('Soft');
  return (
    <div class="tour-live">
      <div class="tour-skins" role="group" aria-label="Skin">
        <For each={[...SKINS]}>
          {(name: Skin) => (
            <button type="button" aria-pressed={skin() === name ? 'true' : 'false'} onClick={() => skin.set(name)}>
              {name}
            </button>
          )}
        </For>
      </div>
      <div class="tour-sample" data-skin={skin()}>
        <strong>New project</strong>
        <span class="tour-input">Project name</span>
        <div class="tour-actions">
          <button type="button" class="primary">Create</button>
          <button type="button" class="secondary">Cancel</button>
        </div>
      </div>
      <p class="tour-note">Same markup, four skins (an illustration of Fluixi UI's skins).</p>
    </div>
  );
}

export function Tour() {
  const tabId = signal(TABS[0].id);
  const pillIndex = signal(0);
  const tab = memo(() => TABS.find((t) => t.id === tabId()) ?? TABS[0]);
  const pill = memo(() => tab().pills[Math.min(pillIndex(), tab().pills.length - 1)]);

  const select = (id: string) => {
    tabId.set(id);
    pillIndex.set(0);
  };
  // Arrow keys move between tabs, as the WAI-ARIA tabs pattern expects.
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex((t) => t.id === tabId());
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    select(next.id);
    (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <section class="tour wrap" aria-label="A tour of Fluixi">
      <div class="tour-frame" style={`--tab: light-dark(${tab().color.light}, ${tab().color.dark})`}>
        <div class="tour-tabs" role="tablist" aria-label="Areas of the framework" onKeyDown={onTabKey}>
          <For each={TABS}>
            {(t) => (
              <button
                type="button"
                role="tab"
                id={`tour-tab-${t.id}`}
                data-tab={t.id}
                aria-selected={tabId() === t.id ? 'true' : 'false'}
                aria-controls="tour-panel"
                tabindex={tabId() === t.id ? 0 : -1}
                onClick={() => select(t.id)}
              >
                {t.label}
              </button>
            )}
          </For>
        </div>
        <div class="tour-body" id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${tabId()}`}>
          <div class="tour-head">
            <h2>{tab().title}</h2>
            <p>{tab().text}</p>
          </div>
          <div class="tour-pills">
            <For each={tab().pills}>
              {(p, i) => (
                <button type="button" aria-pressed={pill() === p ? 'true' : 'false'} onClick={() => pillIndex.set(i())}>
                  {p.label}
                </button>
              )}
            </For>
          </div>
          <Show
            when={pill().preview}
            fallback={
              <div class="tour-split">
                <div class="tour-copy">
                  <h3>{pill().title}</h3>
                  <p>{pill().text}</p>
                </div>
                <div class="tour-window">
                  <div class="tour-file"><span>{pill().file}</span></div>
                  <CodeView code={pill().code} />
                </div>
              </div>
            }
          >
            <div class="tour-copy">
              <h3>{pill().title}</h3>
              <p>{pill().text}</p>
            </div>
            <div class="tour-window">
              <div class="tour-file">
                <span>{pill().file}</span>
                <span>{pill().preview === 'compiled' ? 'compiled by @fluixi/compiler' : 'live'}</span>
              </div>
              <div class="tour-pair">
                <CodeView code={pill().code} />
                <div class="tour-side">
                  <Show when={pill().preview === 'compiled'}>
                    <CodeView code={COMPILED} small />
                  </Show>
                  <Show when={pill().preview === 'counter'}>
                    <Counter />
                  </Show>
                  <Show when={pill().preview === 'form'}>
                    <FormPreview />
                  </Show>
                  <Show when={pill().preview === 'skins'}>
                    <SkinsPreview />
                  </Show>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </section>
  );
}
