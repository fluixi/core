# Les composants

Un composant n'est qu'une fonction qui renvoie du balisage. Pas de classe de base, pas de cycle de
réaffichage, un composant s'exécute **une seule fois** pour créer son DOM, et la réactivité le
maintient à jour.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Bonjour, {props.name}</h1>;
}

<Greeting name="Ada" />;
```

## Les props sont réactives

Comme un composant ne s'exécute qu'une fois, une prop est une lecture vivante plutôt qu'une
valeur transmise à l'appel. Lisez-les **là où vous les utilisez** et les mises à jour circulent :

```tsx
function Hello(props: { name: string }) {
  return <p>{props.name}</p>;   // reste réactif
}
// const { name } = props;       // en JavaScript seul, lu une fois : voir plus bas
```

La déstructuration recopie la valeur à cet instant : `name` cesse alors de suivre la prop. C'est
du JavaScript ordinaire, pas une règle inventée par Fluixi.

### Déstructurer quand même

Le compilateur retransforme ces liaisons en lectures, ce qui rend la syntaxe simple utilisable,
dans la liste des paramètres ou en tête du corps :

```tsx
function Hello({ name, tone = 'calm' }) {
  return <p data-tone={tone}>{name}</p>;   // les deux restent réactifs
}

function Badge(props) {
  const { label, ...rest } = props;         // réécrit de la même façon
  return <span {...rest}>{label}</span>;
}
```

Une déstructuration de `props` exécutée une seule fois ailleurs dans la mise en place du
composant, dans un bloc `if` ou partageant son `const` avec d'autres noms, reste telle quelle et
la compilation le signale. Celle d'une fonction de rappel convient comme elle est : elle lit les
valeurs actuelles à chaque appel.

Le compilateur écrit `props.name` à chaque usage : la liaison garde son type, donc rien d'autre
ne change dans la fonction. C'est actif par défaut ; `fluixi({ propsDestructure: false })` le
désactive, ce qu'il faut pour un paquet qui publie ses sources afin que le consommateur les
compile.

Alias, valeurs par défaut et motifs imbriqués fonctionnent, et une valeur par défaut ne
s'applique toujours qu'à `undefined`, exactement comme en JavaScript.

`...rest` devient l'appel à `splitProps` que vous auriez écrit :

```tsx
function Field({ label, ...rest }) {
  return <input aria-label={label} {...rest} />;
}
```

`splitProps` transmet les props restantes sous forme de getters au lieu de les lire, donc un
signal derrière une prop transmise atteint toujours l'élément.

Là où le compilateur ne peut pas prouver que la réécriture est sûre, il laisse votre code tel
quel et explique pourquoi : une liaison réassignée, une clé calculée, une valeur par défaut
qu'il faudrait réévaluer à chaque lecture. Celles-là gardent le sens JavaScript qu'elles ont
toujours eu.

Un point de vigilance : cela dépend de **la façon dont le code est compilé**, pas du code
lui-même. Si vous publiez un paquet qui livre ses sources pour que d'autres les compilent,
écrivez les props explicitement, un consommateur sans l'option les lirait une seule fois. La
sortie compilée, elle, convient dans tous les cas.

L'[exemple props](https://github.com/fluixi/core/tree/main/examples/props) montre le tout en
fonctionnement ; désactiver l'option dans sa configuration est le moyen le plus rapide de voir
la différence.

### Quelles expressions restent vivantes

Pour chaque prop et chaque enfant écrits en JSX, le compilateur choisit entre passer une valeur
ou une lecture. Il enveloppe l'expression dans un getter dès qu'une partie peut changer : un
appel (`count()`, `t('clé')`), une lecture de propriété (`props.name`, `user.email`), ou un
opérateur appliqué à l'un des deux. Les littéraux et les identifiants seuls passent une fois.

```tsx
<Panel
  open={open()}                    // vivant : un appel
  collapsed={!(pinned() && wide())} // vivant : une négation d'appels
  label={title() as string}        // vivant : une assertion de type sur un appel
  size="sm"                        // passé une fois : un littéral
  onClose={close}                  // passé une fois : une fonction
/>
```

La négation et les autres opérateurs unaires (`!x()`, `-x()`), ainsi que `x()!`, `x() as T` et
`x() satisfies T` de TypeScript, comptent comme l'appel qu'ils contiennent. Avant
1.0.0-alpha.109, ils passaient une seule fois : `collapsed={!panelOpen()}` gardait sa première
valeur jusqu'au rechargement de la page. Le correctif ne demande aucun changement dans votre
code.

Une fonction fléchée est une valeur comme une autre : `onClose={() => close()}` transmet la
fonction, elle ne rend pas la prop vivante.

## Les enfants

`props.children` contient ce que vous imbriquez dans un composant :

```tsx
function Card(props: { children?: any }) {
  return <div class="card">{props.children}</div>;
}

<Card><p>Contenu</p></Card>;
```

Lire `props.children` exécute le code qui les construit. Lisez-le une fois ; quand le
composant doit examiner ses enfants (les compter, en isoler certains), résolvez-les avec
`readChildren`, qui garde le résultat dans un memo, fonctions imbriquées résolues et tableaux
aplatis :

```tsx
import { readChildren } from '@fluixi/core';

function Tabs(props: { children?: any }) {
  const items = readChildren(() => props.children);
  return <nav data-count={() => [items()].flat().length}>{items()}</nav>;
}
```

## Des ids pour les libellés et l’ARIA

`createUniqueId()` donne un id sur lequel le rendu serveur et le navigateur s’accordent, pour
relier des éléments : un `<label for>` et son `<input id>`, `aria-describedby`, `aria-controls`.

```tsx
import { createUniqueId } from '@fluixi/core';

function Field(props: { label: string; hint: string }) {
  const id = createUniqueId();
  const hint = createUniqueId();
  return (
    <div>
      <label for={id}>{props.label}</label>
      <input id={id} aria-describedby={hint} />
      <p id={hint}>{props.hint}</p>
    </div>
  );
}
```

Appelez-le dans le corps du composant, autant de fois de chaque côté : les ids suivent la place
du composant dans la page, donc un appel fait d’un seul côté décale ceux qui suivent. Un
composant créé plus tard dans le navigateur reçoit un id unique dans la page.

## Props par défaut

`mergeProps` complète les valeurs par défaut sans lire les props, qui restent donc vivantes :

```tsx
import { mergeProps } from '@fluixi/core';

function Button(props: { size?: 'sm' | 'md'; children?: any }) {
  const p = mergeProps({ size: 'md' }, props);
  return <button data-size={p.size}>{p.children}</button>;
}
```

Une valeur par défaut dans une déstructuration (`function Button({ size = 'md' })`) fait la même
chose une fois réécrite par le compilateur, comme plus haut.

## Événements

`onClick={handler}` et les autres props `on` attachent des gestionnaires. Les événements qui
remontent sont délégués : un seul écouteur par type d'événement sur le document trouve le
gestionnaire quand l'événement remonte, donc une liste de mille lignes n'ajoute pas mille
écouteurs. Les événements qui ne remontent pas (`focus`, `blur`, `scroll`, `mouseenter`) ont un
écouteur sur l'élément. `on:click` attache toujours directement sur l'élément, quand c'est ce qu'il
vous faut.

Une prop de rappel est la façon dont un composant prévient son parent que quelque chose s'est
passé :

```tsx
function Rating(props: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup">
      <For each={[1, 2, 3, 4, 5]}>
        {(n) => (
          <button aria-pressed={String(props.value >= n)} onClick={() => props.onChange(n)}>{n}</button>
        )}
      </For>
    </div>
  );
}
```

## Un exemple réaliste

Un champ modifiable : il affiche une valeur, passe en saisie au clic, et transmet la nouvelle
valeur. L'état propre au composant reste à l'intérieur ; ce qui appartient au parent arrive en
props et repart par un rappel.

```tsx
function EditableTitle(props: { value: string; onSave: (v: string) => void }) {
  const editing = $signal(false);
  const draft = $signal('');
  let input!: HTMLInputElement;

  const start = () => {
    draft.set(props.value);
    editing.set(true);
    queueMicrotask(() => input.focus());
  };
  const save = () => {
    editing.set(false);
    if (draft() !== props.value) props.onSave(draft());
  };

  return (
    <Show when={editing()} fallback={<h2 onClick={start}>{props.value}</h2>}>
      <input
        ref={input}
        value={draft()}
        onInput={(e) => draft.set(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' ? save() : e.key === 'Escape' && editing.set(false)}
        onBlur={save}
      />
    </Show>
  );
}
```

## Où l'utiliser, et où non

Faites un composant pour un morceau d'interface qui a son propre sens ou son propre état. Gardez la
logique qui doit se relancer dans des memos et des effets, pas dans le corps du composant : le
corps s'exécute une fois.

**Pas appelé comme une fonction.** `Card(props)` l'exécute en dehors du framework : pas de
propriétaire pour ses effets et ses nettoyages, pas de props réactives. Écrivez `<Card {...props} />`.

**Pas de `return` anticipé.** Le corps s'exécute une fois, donc `if (!user()) return <Login />` est
décidé une fois ; utilisez `<Show>` ([Le flux de contrôle](/v1/fr/control-flow)).

**Pas `props.children` lu deux fois.** Chaque lecture reconstruit les enfants ; lisez-le une fois,
ou utilisez `readChildren`.

**Pas de valeur propre au navigateur dans le premier rendu.** `Date.now()`, `Math.random()`,
`window`, `localStorage` : le serveur et le navigateur afficheraient un balisage différent. Prenez la
valeur dans les données, fixez-la dans `onMount`, ou enveloppez la partie dans `<ClientOnly>`.

## Sous le capot

Le compilateur transforme `<Greeting name={x()} />` en un appel qui crée le composant avec un objet
de props dont `name` est un accesseur : `{ get name() { return x(); } }`. La fonction du composant
s'exécute une fois, sans suivi, donc rien de ce qu'elle lit ne relance son parent ; chaque prop est
lue par son accesseur là où l'enfant l'utilise, et c'est ainsi qu'un changement atteint l'enfant
sans l'appeler à nouveau. Le composant s'exécute sous son propre propriétaire, qui garde ses effets
et ses nettoyages et disparaît quand le composant quitte la page.

Suivant : **[Le flux de contrôle](/v1/fr/control-flow)**.
