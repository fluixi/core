# Directives

Les directives sont des attributs spéciaux que le compilateur comprend. La plupart
fonctionnent dans **JSX et `` html`` ``** ; quelques formes à mot-clé (`if`, `each`,
`bind:`, `class:name`, `style:prop`) sont réservées à `` html`` ``, car elles n'ont pas
d'équivalent JSX propre et vérifiable par le typage.

## Événements

Événements délégués (un seul écouteur à la racine, distribué par le framework) :

```ts
html`<button @click=${onClick}>Enregistrer</button>`;   // html``, @event
// Équivalent JSX :
<button onClick={onClick}>Enregistrer</button>;
```

`@click` et `onClick` sont strictement identiques.

### Délégué ou natif

Quatre événements sont délégués : **`click`, `input`, `change`, `submit`**. Un seul
écouteur est posé à la racine puis distribué au bon élément : mille lignes coûtent un
écouteur, pas mille.

Tout le reste est attaché directement. Pour un écouteur **natif** sur un événement délégué,
nécessaire pour `capture`, `once` ou `passive` : utilisez `on:` :

```ts
html`<div on:scroll=${onScroll}></div>`;
<div on:scroll={onScroll} />;   // JSX, signature d'index on:
```

Un gestionnaire délégué voit toujours `event.currentTarget` comme l'élément auquel il est
attaché, comme avec `addEventListener` : `new FormData(event.currentTarget)` fonctionne dans un
`onSubmit`.

### Modificateurs

Les modificateurs pointés s'appliquent aux formes `@`/`on:` :

| Modificateur | Effet |
| --- | --- |
| `.capture` | écoute en phase de capture |
| `.once` | retiré après le premier appel |
| `.passive` | marque l'écouteur comme passif |
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.self` | seulement si `event.target === currentTarget` |

```ts
html`<form @submit.prevent=${save}></form>`;
html`<div on:wheel.passive=${onWheel}></div>`;
```

`.capture`, `.once` et `.passive` deviennent des options d'`addEventListener` : ils
impliquent donc un écouteur natif. `.prevent`, `.stop` et `.self` enveloppent votre
gestionnaire et fonctionnent dans les deux cas.

En JSX, `oncapture:event` abrège un écouteur natif en phase de capture :

```tsx
<div oncapture:click={onClick} />;
```

## Liaisons d'élément

### ref

Capture l'élément dans une variable ou une fonction :

```ts
let el!: HTMLInputElement;
html`<input ref=${el} />`;
html`<input ref=${(node) => (el = node)} />`;
```

La ref est affectée à la création de l'élément, **avant** son insertion dans le document.
Lisez la mise en page dans `onMount`, pas dans la fonction ref, à ce moment-là l'élément
n'a pas encore de boîte.

### use, directives personnalisées

`use=${fn}` appelle `fn(element)` au montage ; la forme nommée passe des options :

```ts
html`<div use=${tooltip}></div>`;
html`<div use:tooltip=${{ text: 'Salut' }}></div>`;
<div use:tooltip={{ text: 'Salut' }} />;   // JSX
```

Une directive est une fonction ordinaire, `(el, options) => ...`. Les options sont passées
sous forme d'accesseur pour que la directive puisse les suivre, et tout ce qu'elle
enregistre doit être libéré avec `onCleanup` en son sein.

En JSX, le nom doit être une valeur visible par TypeScript : importez la directive même si
seule la forme directive l'utilise.

### prop: / attr: / bool:

Forcent la façon dont une valeur est appliquée, en contournant l'heuristique
propriété/attribut. Fonctionnent dans **JSX et `` html`` ``** :

```ts
html`<input prop:value=${text()} />`;      // toujours la propriété DOM (element.value = ...)
html`<div attr:data-id=${id()} />`;        // toujours setAttribute
html`<button bool:disabled=${busy()} />`;  // présent si vrai, retiré si faux
```

```tsx
<my-widget prop:config={config()} />;
<circle attr:cx={x()} />;
<button bool:disabled={busy()} />;
```

L'heuristique tombe juste la plupart du temps. Les trois cas où elle échoue, et où il faut
forcer :

- **Les éléments personnalisés** qui reçoivent des valeurs riches, un objet doit passer
  par une propriété, un attribut le transformerait en `[object Object]`.
- **Les valeurs qui diffèrent de leur attribut**, `input.value` est la valeur courante,
  alors que l'attribut `value` n'est que la valeur par défaut.
- **Les attributs booléens**, `disabled="false"` reste désactivé ; `bool:` le retire.

### .prop et ?attr (raccourcis html``)

Raccourcis à la Lit pour la même idée :

```ts
html`<video .currentTime=${t()}></video>`;   // liaison de propriété, comme prop:
html`<button ?disabled=${busy()}></button>`; // attribut booléen, comme bool:
```

### class et style

`classList` et un objet `style` fonctionnent dans les deux surfaces :

```ts
html`<div class=${{ active: on(), big: large() }}></div>`;
html`<div style=${{ color: c(), '--x': px() }}></div>`;
<div classList={{ active: on() }} style={{ color: c() }} />;
```

Un `class` statique et un `class` dynamique se cumulent, `class="box"` reste la classe de
l'élément et l'objet s'y ajoute : vous pouvez garder les classes de base dans le balisage.

> **`class=` ne devient `classList` que pour un objet littéral.** Le compilateur décide en
> regardant la syntaxe : `class=${{ on: a() }}` est une carte de classes, tandis que
> `const o = { on: a() }; class=${o}` compile en `className = o` et affiche
> `[object Object]`. Passez le littéral en ligne, ou utilisez `classList=` explicitement.

Les bascules par nom évitent complètement le problème, dans les deux surfaces, et chacune ne met à
jour que sa propre classe ou propriété :

```ts
html`<div class:active=${on()} class:big=${large()}></div>`;
html`<div style:color=${c()} style:--x=${px()}></div>`;
<div class:active={on()} style:color={c()} />;
```

Les propriétés personnalisées (`--x`) passent par `setProperty` : elles fonctionnent dans
les deux formes. JSX ne sait pas lire `style:--x`, un nom ne pouvant pas commencer par `-` :
mettez la propriété dans l'objet de style, `style={{ '--x': px() }}`. Sur un élément, un objet de
style écrit en littéral se met lui aussi à jour propriété par propriété.

### html, innerHTML brut

```ts
html`<div html=${markup()}></div>`;      // html``, affecte innerHTML
<div innerHTML={markup()} />;            // JSX, la prop s'appelle innerHTML
```

L'écriture `html=` est réservée à `` html`` `` ; en JSX, écrivez `innerHTML` directement.
Les deux sont réactives si on leur donne un accesseur.

> **C'est le seul endroit où un trou est analysé comme du HTML.** Partout ailleurs une
> valeur devient du texte ou un attribut et ne peut pas injecter de balisage. Ne passez
> jamais ici du contenu fourni par l'utilisateur sans l'assainir, une chaîne contenant
> `<img onerror=...>` s'exécutera. Si vous n'avez besoin que de texte, interpolez
> normalement : c'est déjà sûr.

Le contenu ainsi défini est remplacé en bloc à chaque changement : tout ce qu'il contient
est hors du système réactif, pas de liaisons, pas de composants, pas de nettoyage.

### ...spread

Diffuse un objet de props/attributs (fusionné avec `mergeProps`) :

```ts
html`<div ...${attrs}></div>`;
<div {...attrs} />;
```

Le spread s'applique dans l'ordre d'écriture : une prop placée après l'emporte, une prop
placée avant peut être écrasée. Passez un getter ou un store quand l'ensemble des props
change lui-même.

## Contrôle de flux

`if`, `else` et `each` compilent vers `<Show>` et `<For>`. Ils fonctionnent dans les
templates html`` et en JSX, sur n'importe quel élément et sur `<container>`.

### if / else

```ts
html`
  <p if=${user()}>Bienvenue, ${user()!.name}</p>
  <a else href="/login">Se connecter</a>
`;
```

```tsx
<p if={user()}>Bienvenue, {user()!.name}</p>
<a else href="/login">Se connecter</a>
```

`if` compile en `<Show when>`. Le frère suivant devient le fallback s'il porte `else`. Des
espaces entre les deux ne gênent pas ; tout autre texte ou élément casse l'appariement.

La branche est créée et détruite, pas masquée : la quitter déclenche le nettoyage, y
revenir la reconstruit.

### each / key

```ts
html`<ul each=${items()}>${(item) => html`<li>${item.label}</li>`}</ul>`;
```

`each` compile en un `<For each>` à l'intérieur de l'élément. L'élément est rendu une seule
fois et son contenu une fois par item. L'enfant `${(item) => ...}` est la fonction de rendu
et reçoit l'item lui-même. Un contenu qui n'est pas une fonction est répété tel quel.

Placez `each` sur la liste, pas sur l'item :

```ts
html`<div class="swatches" each=${colors()}>
  ${(color) => html`<span style="background: ${color}">${color}</span>`}
</div>`;
```

Une fonction de rendu qui renvoie du texte reste réactive : `${(item) => item.label +
suffix()}` se met à jour quand `suffix` change.

Ajoutez `key` pour indexer la liste par un champ, ou passez une fonction qui renvoie la
clé, afin que les lignes soient réutilisées par identité plutôt que par position. Avec une
clé, la fonction de rendu reçoit un accesseur :

```ts
html`<ul each=${rows()} key="id">${(row) => html`<li>${row().name}</li>`}</ul>`;
```

Sans clé, le DOM d'une ligne est lié à son indice, insérer en tête reconstruit tout ce qui
suit. Avec une clé, seul ce qui a réellement bougé est touché. Indexez toute liste dont les
éléments sont insérés, retirés ou réordonnés.

`if` et `each` peuvent être sur le même élément. La condition décide si l'élément existe,
et la liste le remplit.

JSX accepte les mêmes attributs :

```tsx
<ul each={rows()} key="id">{(row: Accessor<Row>) => <li>{row().name}</li>}</ul>
```

TypeScript ne peut pas inférer `row` sur une balise en minuscules : annotez le paramètre, ou
utilisez `<For>` là où vous voulez l'inférence. Dans les templates html``, le plugin
TypeScript de Fluixi l'infère.

### container

`<container>` porte `if`, `else` ou `each` sans ajouter d'élément. Le compilateur le
retire et ne rend que son contenu, ce qui compte là où un conteneur casserait le balisage :

```ts
html`<tr>
  <container each=${rows()}>${(r) => html`<td>${r.name}</td><td>${r.total}</td>`}</container>
</tr>`;

html`
  <container if=${user()}><Avatar /> ${user()!.name}</container>
  <container else><a href="/login">Se connecter</a></container>
`;
```

Il fonctionne de la même façon en JSX. Ses autres attributs sont ignorés. Le nom n'a pas de
tiret, il ne peut donc jamais entrer en conflit avec un custom element.

### bind: liaison bidirectionnelle

`bind:value` et `bind:checked` lient un champ à un tuple de signal `[get, set]` :

```ts
const name = $signal('');
html`<input bind:value=${name} />`;                 // value + événement input
html`<input type="checkbox" bind:checked=${on} />`; // checked + événement change
```

Passez le signal lui-même, `signal(...)` ou la paire `[get, set]` de `createSignal(...)`, les
deux marchent, jamais un accesseur seul, puisque la liaison écrit autant qu'elle lit. La
liaison lit `event.target` : elle fonctionne donc sur tout élément portant `value` ou
`checked`. Pour le reste, les valeurs multiples d'un `select`, un nombre à convertir,
écrivez les deux moitiés vous-même ; `bind:` ne couvre délibérément que le cas courant.

## JSX et html`` en un coup d'œil

| Directive | JSX | html`` |
| --- | --- | --- |
| `@click` / `onClick`, `on:event`, modificateurs | ✓ | ✓ |
| `ref` | ✓ | ✓ |
| `use:` | ✓ | ✓ |
| `prop:` / `attr:` / `bool:` | ✓ | ✓ |
| `classList`, objet `style`, `...spread` | ✓ | ✓ |
| HTML brut | `innerHTML` | `html=` ou `innerHTML` |
| `oncapture:event` | ✓ |, |
| `.prop`, `?attr` |, | ✓ |
| `class:name`, `style:prop` |, | ✓ |
| `if` / `else`, `each` / `key`, `<container>` | ✓ | ✓ |
| `bind:` |, | ✓ |
