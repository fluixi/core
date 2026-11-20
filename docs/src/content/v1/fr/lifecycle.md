# Le cycle de vie

Une fonction de composant s'exécute une fois et ne se réaffiche jamais : son cycle de vie se
résume à deux moments, quand il est dans la page et quand il s'en va. `onMount` et `onCleanup` les
marquent ; `ref` vous donne l'élément entre les deux.

## onMount

S'exécute une fois, dans le navigateur, quand les éléments du composant sont dans la page. Jamais
pendant un rendu serveur.

```tsx
import { onMount } from '@fluixi/core';

function Search() {
  let input!: HTMLInputElement;
  onMount(() => input.focus());
  return <input ref={input} type="search" />;
}
```

Une fonction renvoyée par `onMount` s'exécute quand le composant s'en va : la mise en place et le
démontage restent côte à côte.

```ts
onMount(() => {
  const observer = new ResizeObserver(([entry]) => width.set(entry.contentRect.width));
  observer.observe(panel);
  return () => observer.disconnect();
});
```

## onCleanup

S'exécute quand la portée propriétaire disparaît : le composant quitte la page, une branche de
`<Show>` se ferme, une ligne de liste est retirée. Dans un effet, il s'exécute aussi avant chaque
nouvelle exécution.

```tsx
import { onCleanup } from '@fluixi/core';

function Clock() {
  const now = $signal(new Date());
  const id = setInterval(() => now.set(new Date()), 1000);
  onCleanup(() => clearInterval(id));
  return <time>{now().toLocaleTimeString()}</time>;
}
```

`onUnmount` est la même fonction sous un autre nom.

## Les refs

`ref` vous donne l'élément lui-même. Affectez-le à une variable, ou passez une fonction :

```tsx
let el!: HTMLInputElement;
<input ref={el} />;
<input ref={(node) => (el = node)} />;
```

L'élément existe dès que le composant le construit, mais il n'est dans la page qu'une fois
`onMount` exécuté : c'est là qu'on le mesure, qu'on lui donne le focus ou qu'on le passe à une
bibliothèque.

## Un exemple réaliste

Un menu déroulant qui se ferme sur un clic à l'extérieur et sur Échap. Les écouteurs sont posés sur
le document tant que le menu est ouvert, et retirés quand il se ferme ou que le composant s'en va :

```tsx
function Dropdown(props: { label: string; children?: any }) {
  const open = $signal(false);
  let root!: HTMLDivElement;

  $effect(() => {
    if (!open()) return;
    const onPointer = (e: PointerEvent) => !root.contains(e.target as Node) && open.set(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open.set(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    });
  });

  return (
    <div ref={root}>
      <button aria-expanded={open()} onClick={() => open.set((o) => !o)}>{props.label}</button>
      <Show when={open()}>{props.children}</Show>
    </div>
  );
}
```

L'effet lit `open()` en premier : sur le serveur, où le menu commence fermé, il s'arrête avant de
toucher à `document`.

## Où l'utiliser, et où non

Utilisez `onMount` pour ce qui a besoin de l'élément dans la page ou du navigateur lui-même : focus,
mesures, widget tiers, lecture de `localStorage` ou de la fenêtre. Utilisez `onCleanup` à côté de
tout ce qui doit être défait : minuteur, écouteur, abonnement, widget.

**`onMount` ne suit rien.** Un signal lu à l'intérieur n'abonne rien : il ne se relancera pas quand
ce signal change. Utilisez un effet pour un travail qui doit suivre une valeur.

**Pas pour charger des données.** Des données chargées dans `onMount` ne partent qu'une fois la page
affichée, manquent au rendu serveur et n'ont ni état de chargement ni état d'erreur. Utilisez le
`routeData` de la route ou une [ressource](/v1/fr/async).

**Pas pour contourner une différence d'hydratation, sauf exprès.** Écrire dans un signal depuis
`onMount` une valeur propre au navigateur (la taille de la fenêtre, une préférence enregistrée) est
la bonne façon de l'afficher après l'hydratation ; le premier rendu, des deux côtés, utilise la
valeur par défaut. Pour tout un sous-arbre qui ne peut pas être rendu sur le serveur, `<ClientOnly>`
est plus clair.

**Chaque écouteur et chaque minuteur a besoin de son `onCleanup`.** Sans lui, un composant qui
quitte la page garde ses minuteurs et ses écouteurs en marche, et la mémoire qu'ils retiennent.

## Sous le capot

Chaque composant s'exécute sous un propriétaire, un nœud d'un arbre qui reflète l'arbre des
composants. `onMount` met son rappel en file sur le propriétaire et exécute la file dans une
microtâche une fois le composant construit ; `onCleanup` ajoute un rappel à la liste de
destruction du propriétaire. Quand un propriétaire disparaît (son `<Show>` se ferme, sa ligne est
retirée, son parent s'en va), ses enfants disparaissent d'abord, puis ses propres nettoyages
s'exécutent dans l'ordre inverse.

Suivant : **[Le routage](/v1/fr/routing)**.
