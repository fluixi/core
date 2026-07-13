# Directives

Les directives sont des attributs spéciaux que le compilateur comprend. La plupart fonctionnent dans
**JSX et `` html`` ``** ; quelques formes à mot-clé (`if`, `each`, `bind:`, `class:name`,
`style:prop`) sont réservées à `` html`` ``, car elles n'ont pas d'équivalent JSX propre et
vérifiable par le typage.

## Événements

Événements délégués (un seul écouteur à la racine, distribué par le framework) :

```ts
html`<button @click=${onClick}>Enregistrer</button>`;   // html`` — @event
// Équivalent JSX :
<button onClick={onClick}>Enregistrer</button>;
```

`@click` et `onClick` sont identiques. Pour un écouteur **natif** (`addEventListener`, sans
délégation — requis pour `capture`/`once`/`passive`), utilisez `on:` :

```ts
html`<div on:scroll=${onScroll}></div>`;
<div on:scroll={onScroll} />;   // JSX — signature d'index on:
```

### Modificateurs

Les modificateurs pointés fonctionnent sur les formes `@`/`on:` :

| Modificateur | Effet |
| --- | --- |
| `.capture` | écoute en phase de capture |
| `.once` | retiré après le premier appel |
| `.passive` | marque l'écouteur comme passif |
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.self` | uniquement si `event.target === currentTarget` |

```ts
html`<form @submit.prevent=${save}></form>`;
html`<div on:wheel.passive=${onWheel}></div>`;
```

En JSX, `oncapture:event` est un raccourci pour un écouteur natif en phase de capture :

```tsx
<div oncapture:click={onClick} />;
```

## Liaisons d'élément

### ref

Capture l'élément dans une variable ou un callback :

```ts
let el!: HTMLInputElement;
html`<input ref=${el} />`;
html`<input ref=${(node) => (el = node)} />`;
```

### use — directives personnalisées

`use=${fn}` appelle `fn(element)` au montage ; la forme nommée passe des options :

```ts
html`<div use=${tooltip}></div>`;
html`<div use:tooltip=${{ text: 'Salut' }}></div>`;
<div use:tooltip={{ text: 'Salut' }} />;   // JSX
```

### prop: / attr: / bool:

Forcent la façon dont une valeur est appliquée, en contournant l'heuristique propriété-ou-attribut.
Fonctionnent dans **JSX et `` html`` ``** :

```ts
html`<input prop:value=${text()} />`;   // toujours la propriété DOM (element.value = …)
html`<div attr:data-id=${id()} />`;     // toujours setAttribute
html`<button bool:disabled=${busy()} />`; // attribut booléen : présent si vrai, retiré si faux
```

```tsx
<my-widget prop:config={config()} />;
<circle attr:cx={x()} />;
<button bool:disabled={busy()} />;
```

### .prop et ?attr (raccourcis html``)

Raccourcis de style lit pour la même idée :

```ts
html`<video .currentTime=${t()}></video>`;   // liaison de propriété — comme prop:
html`<button ?disabled=${busy()}></button>`; // attribut booléen — comme bool:
```

### class et style

`classList` et un objet `style` fonctionnent dans les deux surfaces :

```ts
html`<div class=${{ active: on(), big: large() }}></div>`;
html`<div style=${{ color: c(), '--x': px() }}></div>`;
<div classList={{ active: on() }} style={{ color: c() }} />;
```

`` html`` `` propose en plus des bascules par nom :

```ts
html`<div class:active=${on()} class:big=${large()}></div>`;
html`<div style:color=${c()} style:--x=${px()}></div>`;
```

### html — innerHTML brut

```ts
html`<div html=${markup()}></div>`;   // définit innerHTML (réactif si on passe un accesseur)
```

### ...spread

Diffuse un objet de props/attributs (fusionné avec `mergeProps`) :

```ts
html`<div ...${attrs}></div>`;
<div {...attrs} />;
```

## Contrôle de flux (html`` uniquement)

Ces formes compilent vers les composants `<Show>` / `<For>` — du sucre pour les cas courants.

### if / else

```ts
html`
  <p if=${user()}>Bienvenue, ${user()!.name}</p>
  <a else href="/login">Se connecter</a>
`;
```

`if` compile vers `<Show when>` ; un frère immédiatement suivant avec `else` devient le fallback.

### each / key

```ts
html`<li each=${items()}>${(item) => item.label}</li>`;
```

`each` compile vers `<For each>` ; l'enfant `${item => …}` est la fonction de rendu. Ajoutez
`key="id"` pour indexer la liste par un champ (les lignes sont alors réutilisées par identité) :

```ts
html`<li each=${rows()} key="id">${(row) => row().name}</li>`;
```

### bind: — liaison bidirectionnelle

`bind:value` / `bind:checked` lient un champ à un tuple de signal `[get, set]` :

```ts
const name = createSignal('');
html`<input bind:value=${name} />`;              // value + événement input
html`<input type="checkbox" bind:checked=${on} />`; // checked + événement change
```

## JSX vs html`` en un coup d'œil

| Directive | JSX | html`` |
| --- | --- | --- |
| `@click` / `onClick`, `on:event`, modificateurs | ✓ | ✓ |
| `ref`, `use:` | ✓ | ✓ |
| `prop:` / `attr:` / `bool:` | ✓ | ✓ |
| `classList`, objet `style`, `...spread` | ✓ | ✓ |
| `oncapture:event` | ✓ | — |
| `.prop`, `?attr` | — | ✓ |
| `class:name`, `style:prop` | — | ✓ |
| `if` / `else`, `each` / `key`, `bind:` | — (utilisez `<Show>`/`<For>`) | ✓ |
