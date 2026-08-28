# CDN & bundles

Chaque package runtime de Fluixi fournit un **build global IIFE** autonome que vous pouvez
déposer dans une page avec un seul `<script>` — sans bundler, sans étape de build, sans
installation npm. Ils sont publiés à chaque release et servis depuis
[unpkg](https://unpkg.com) et [jsDelivr](https://www.jsdelivr.com).

## Tailles des bundles

Chaque global est entièrement autonome (ses dépendances sont incluses), vous ne chargez donc
qu'un seul fichier. Les tailles sont minifiées ; le `gzip` est ce qui transite sur le réseau.

| Script | Global | Contenu | Taille |
| --- | --- | --- | --- |
| `@fluixi/reactive/dist/cdn/signal.global.js` | `window.Signal` | Le cœur TC39-Signals brut (`State`, `Computed`, `subtle`) | 3.4 Ko <small>(1.3 Ko gz)</small> |
| `@fluixi/reactive/dist/cdn/reactive.global.js` | `window.Fluixi` | API réactive complète (signals, memos, effects, stores, resources) | 29.6 Ko <small>(8.7 Ko gz)</small> |
| `@fluixi/dom/dist/cdn/dom.global.js` | `window.FluixiDOM` | Runtime DOM (render, contrôle de flux) **+** l'API réactive | 52.5 Ko <small>(17.0 Ko gz)</small> |
| `fluixi/dist/cdn/core.global.js` | `window.Fluixi` | Tout le framework (réactivité + composants + contrôle de flux + router + `startClient`) | 75.3 Ko <small>(24.8 Ko gz)</small> |

Choisissez le plus petit qui couvre votre besoin : juste la réactivité → `signal` ou `reactive` ;
une UI réactive → `dom` ; le framework applicatif complet → `core`.

## Réactivité seule — `window.Signal`

L'option la plus légère : les primitives Signals de la spécification, rien d'autre.

```html
<script src="https://unpkg.com/@fluixi/reactive/dist/cdn/signal.global.js"></script>
<script>
  const count = new Signal.State(0);
  const doubled = new Signal.Computed(() => count.get() * 2);

  const w = new Signal.subtle.Watcher(() => {
    queueMicrotask(() => { console.log('doubled =', doubled.get()); w.watch(); });
  });
  w.watch(doubled);

  count.set(5); // → doubled = 10
</script>
```

## L'API réactive — `window.Fluixi`

La surface ergonomique `createSignal`/`createMemo`/`createEffect`/`createStore`, sur le même cœur :

```html
<script src="https://unpkg.com/@fluixi/reactive/dist/cdn/reactive.global.js"></script>
<script>
  const { createSignal, createMemo, createEffect } = Fluixi;

  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);
  createEffect(() => console.log('doubled =', doubled()));

  setCount(5); // → doubled = 10
</script>
```

## Une UI réactive — `window.FluixiDOM`

Le runtime DOM plus l'API réactive, pour qu'un seul script construise une interface vivante. Il
ré-exporte les primitives réactives (le dom ne les inclut plus lui-même), donc pas besoin d'un
second fichier.

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/dom/dist/cdn/dom.global.js"></script>
<script>
  const { render, html, createSignal } = FluixiDOM;

  function Counter() {
    const [n, setN] = createSignal(0);
    return html`<button @click=${() => setN(n() + 1)}>compteur : ${n()}</button>`;
  }

  render(() => html`<${Counter} />`, document.getElementById('app'));
</script>
```

Comme il n'y a pas de compilateur dans une page en `<script>` simple, écrivez le balisage avec le
tag `` html`` `` (templates à l'exécution) plutôt qu'en JSX.

## Tout le framework — `window.Fluixi`

`core.global.js` inclut tout — réactivité, composants, contrôle de flux, le router, et
`startClient`. À utiliser quand vous voulez le framework complet sans build :

```html
<div id="app"></div>
<script src="https://unpkg.com/fluixi/dist/cdn/core.global.js"></script>
<script>
  const { render, html, createSignal, Show } = Fluixi;

  function App() {
    const [on, setOn] = createSignal(false);
    return html`
      <button @click=${() => setOn(!on())}>basculer</button>
      <${Show} when=${on}><p>visible</p></${Show}>
    `;
  }

  render(() => html`<${App} />`, document.getElementById('app'));
</script>
```

> `reactive.global.js` et `core.global.js` exposent tous deux `window.Fluixi` — chargez **l'un**
> des deux, pas les deux. `signal.global.js` utilise `window.Signal` et peut coexister avec l'un
> ou l'autre.

## Épinglage de version

`unpkg.com/fluixi@1/…` suit la version majeure ; épinglez une version exacte pour la
reproductibilité, par ex. `unpkg.com/fluixi@1.0.0-alpha.56/dist/cdn/core.global.js`.
jsDelivr fonctionne pareil : `cdn.jsdelivr.net/npm/fluixi/dist/cdn/core.global.js`.

Pour de vraies applications, préférez le chemin compilé (`npm create fluixi`) — le compilateur
produit une sortie plus petite et tree-shakée que n'importe quel bundle global. Les builds CDN
sont pour les démos, prototypes, CodePen/JSFiddle, et l'ajout de réactivité à une page existante.
