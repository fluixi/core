# CDN & bundles

Chaque package runtime de Fluixi fournit un **build global IIFE** autonome que vous pouvez
déposer dans une page avec un seul `<script>`, sans bundler, sans étape de build, sans
installation npm. Ils sont publiés à chaque release et servis depuis
[unpkg](https://unpkg.com) et [jsDelivr](https://www.jsdelivr.com).

## Tailles des bundles

Chaque global est entièrement autonome (ses dépendances sont incluses), vous ne chargez donc
qu'un seul fichier. Les tailles sont minifiées ; le `gzip` est ce qui transite sur le réseau.

| Script | Global | Contenu | Taille |
| --- | --- | --- | --- |
| `@fluixi/reactive/dist/cdn/signal.global.js` | `window.Signal` | Le cœur TC39-Signals brut (`State`, `Computed`, `subtle`) | 4.5 Ko <small>(1.8 Ko gz)</small> |
| `@fluixi/reactive/dist/cdn/reactive.global.js` | `window.Fluixi` | API réactive complète (signals, memos, effects, stores, resources) | 44.2 Ko <small>(13.7 Ko gz)</small> |
| `@fluixi/dom/dist/cdn/dom.global.js` | `window.FluixiDOM` | Runtime DOM (render, contrôle de flux) **+** l'API réactive | 79.4 Ko <small>(26.7 Ko gz)</small> |
| `@fluixi/core/dist/cdn/core.global.js` | `window.Fluixi` | Tout le framework (réactivité + composants + contrôle de flux + router + `startClient`) | 106.4 Ko <small>(35.8 Ko gz)</small> |
| `@fluixi/template-runtime/dist/cdn/fluixi.global.js` | `window.Fluixi` | Le framework **+** le compilateur de templates, pour que `` html`` `` fonctionne dans la page | 130.5 Ko <small>(43.5 Ko gz)</small> |

Choisissez le plus petit qui couvre votre besoin : juste la réactivité → `signal` ou `reactive` ;
une UI réactive → `dom` ; le framework applicatif complet → `core`.

## Réactivité seule, `window.Signal`

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

## L'API réactive, `window.Fluixi`

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

## Une UI réactive, `window.FluixiDOM`

Le runtime DOM plus l'API réactive, pour qu'un seul script construise une interface vivante. Il
ré-exporte les primitives réactives (le dom ne les inclut plus lui-même), donc pas besoin d'un
second fichier.

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/dom/dist/cdn/dom.global.js"></script>
<script>
  const { render, createNativeElement, insert, signal } = FluixiDOM;

  function Counter() {
    const n = signal(0);
    const button = createNativeElement('button');
    button.addEventListener('click', () => n.set(n() + 1));
    insert(button, () => `compteur : ${n()}`);
    return button;
  }

  render(() => Counter(), document.getElementById('app'));
</script>
```

Comme il n'y a pas de compilateur dans une page en `<script>` simple, écrivez le balisage avec le
tag `` html`` `` (templates à l'exécution) plutôt qu'en JSX.

## Tout le framework, `window.Fluixi`

`core.global.js` inclut tout, réactivité, composants, contrôle de flux, le router, et
`startClient`. À utiliser quand vous voulez le framework complet sans build. Son API réactive est
la forme `createSignal` / `createMemo` / `createEffect` ; les poignées `signal` / `memo` /
`effect` de `@fluixi/core` en module ne sont pas sur l'objet global :

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/core/dist/cdn/core.global.js"></script>
<script>
  const { render, insert, createSignal } = Fluixi;

  function Counter() {
    const [n, setN] = createSignal(0);
    const button = document.createElement('button');
    button.addEventListener('click', () => setN(n() + 1));
    insert(button, () => `compteur : ${n()}`);
    return button;
  }

  render(() => Counter(), document.getElementById('app'));
</script>
```

> `reactive.global.js` et `core.global.js` exposent tous deux `window.Fluixi`, chargez **l'un**
> des deux, pas les deux. `signal.global.js` utilise `window.Signal` et peut coexister avec l'un
> ou l'autre.

## Imports nus, `@fluixi/cdn`

L’utilisation d’un objet global pose un seul objet sur `window`, et `reactive`, `core` et `fluixi` revendiquent le même nom, donc un seul peut être chargé. Avec une carte, la page écrit les mêmes `import` qu’une application compilée, et ne charge que les sous-chemins qu’elle touche. Un navigateur ne résout un spécificateur nu que par une carte et ne lit jamais `package.json`, donc chaque sous-chemin transitif doit y figurer ; `@fluixi/cdn` est cette liste, générée à chaque version et épinglée sur elle.

- `min` (20 entrées, `core`, `dom`, `utils` et le graphe derrière)
- `templates` (3 entrées, pour compiler `html`` dans la page)
- `full` (23, tout ce qu’un navigateur peut utiliser)

Chacune existe en `.json` à lire ou coller et en `.js` à charger. Le `.js` installe la carte. Placez-le avant le premier script de module : un Chromium récent accepte une carte ajoutée après le début du chargement des modules, mais un navigateur qui ne prend pas en charge plusieurs cartes d’import l’ignore.

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/cdn/dist/min.js"></script>
<script type="module">
  import { render, signal, effect } from '@fluixi/core';

  function Counter() {
    const n = signal(0);
    const button = document.createElement('button');
    button.addEventListener('click', () => n.set(n() + 1));
    effect(() => { button.textContent = `count: ${n()}`; });
    return button;
  }

  render(() => Counter(), document.getElementById('app'));
</script>
```

`html`` exige le runtime de templates ; le `html` réexporté par `@fluixi/core` est la balise que le compilateur remplace à la construction ; l’appeler dans la page lève une erreur.

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/cdn/dist/full.js"></script>
<script type="module">
  import { render, signal } from '@fluixi/core';
  import { html } from '@fluixi/template-runtime';

  function Counter() {
    const n = signal(0);
    return html`<button @click=${() => n.set(n() + 1)}>count: ${n}</button>`;
  }

  render(() => Counter(), document.getElementById('app'));
</script>
```

Le `.json` reste pour une page qui préfère porter la carte dans son propre balisage ; plusieurs cartes dans une page demandent Chromium 133 ou plus récent, d’où `full` en un seul fichier. `@fluixi-ui/cdn` fait la même chose pour la bibliothèque de composants et se compose avec celles-ci.

## Épinglage de version

`unpkg.com/@fluixi/core@1/...` suit la version majeure ; épinglez une version exacte pour la
reproductibilité, par ex. `unpkg.com/@fluixi/core@1.0.0-alpha.79/dist/cdn/core.global.js`.
jsDelivr fonctionne pareil : `cdn.jsdelivr.net/npm/@fluixi/core/dist/cdn/core.global.js`.

Pour de vraies applications, préférez le chemin compilé (`npm create fluixi`) : le compilateur
produit une sortie plus petite et tree-shakée que n'importe quel bundle global. Les builds CDN
sont pour les démos, prototypes, CodePen/JSFiddle, et l'ajout de réactivité à une page existante.
