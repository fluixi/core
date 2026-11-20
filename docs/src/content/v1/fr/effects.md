# Les effets

Un **effet** est ce qui fait sortir l'état réactif vers l'extérieur : une bibliothèque tierce, un
minuteur, la console, le réseau. Il s'exécute une fois pour apprendre ce qu'il lit, puis à nouveau
après chaque changement de l'une de ces valeurs.

```ts
import { signal, effect } from '@fluixi/reactive/signal';

const volume = signal(0.5);

effect(() => {
  player.setVolume(volume()); // se relance à chaque changement de volume
});
```

`$effect` est la même chose sans import. `createEffect` est la même fonction sous son nom
d'origine, et tout ce qui suit vaut pour les deux.

On en a rarement besoin pour la page elle-même : ce que le JSX affiche se met déjà à jour tout
seul. Les effets servent à ce que le framework ne dessine pas.

## Un exemple réaliste

Un graphique d'une bibliothèque tierce, tenu à jour avec les données. Le graphique est créé une
fois l'élément présent, mis à jour par un effet, et détruit avec le composant :

```tsx
import { onMount, onCleanup } from '@fluixi/core';

function SalesChart(props: { points: () => number[] }) {
  let canvas!: HTMLCanvasElement;
  let chart: Chart | undefined;

  onMount(() => {
    chart = new Chart(canvas, { data: props.points() });
    onCleanup(() => chart?.destroy());
  });

  $effect(() => {
    const points = props.points(); // lu à chaque exécution, l'effet suit donc les données
    chart?.update(points);
  });

  return <canvas ref={canvas} />;
}
```

`onMount` ne s'exécute que dans le navigateur, une fois l'élément dans la page ; l'effet garde
ensuite le graphique à jour à chaque changement de `points`.

## Les effets s'exécutent aussi sur le serveur

Pendant un rendu serveur, un effet s'exécute une fois comme le reste du composant. Le code qui a
besoin du navigateur (`window`, `document`, `localStorage`, les mesures d'un élément) va dans
`onMount`, ou derrière une vérification :

```ts
$effect(() => {
  document.title = title(); // ✗ échoue sur le serveur : il n'y a pas de document
});

onMount(() => {
  // ✓ navigateur seulement, une fois l'élément dans la page
});
```

## Nettoyage

Enregistrez le nettoyage avec `onCleanup`. Il s'exécute avant que l'effet ne se relance et quand
son propriétaire disparaît : minuteurs, écouteurs, abonnements.

```ts
import { onCleanup } from '@fluixi/reactive/signal';

effect(() => {
  const id = setInterval(tick, delay());
  onCleanup(() => clearInterval(id)); // supprimé avant l'exécution suivante, et à la destruction
});
```

## Valeur précédente

L'effet reçoit sa valeur de retour précédente, pour comparer d'une exécution à l'autre :

```ts
effect((prev) => {
  const value = count();
  if (prev !== undefined && prev !== value) report(prev, value);
  return value;
});
```

## Nommer

Le troisième argument nomme l'effet pour le graphe des devtools, comme on nomme signaux et memos :

```ts
effect(() => syncTitle(title()), undefined, { name: 'sync title' });
```

Un effet sans nom apparaît comme un parmi d'autres ; un effet nommé dit à quoi il sert quand on
cherche pourquoi quelque chose s'est relancé.

## Regrouper

Les effets s'exécutent juste après chaque écriture. Plusieurs écritures dans `batch` ne lancent
les effets qui en dépendent **qu'une fois**, après le regroupement :

```ts
import { batch } from '@fluixi/reactive/signal';

batch(() => {
  first.set('Grace');
  last.set('Hopper');
}); // les effets qui dépendent des deux s'exécutent une seule fois
```

## Où l'utiliser, et où non

Utilisez un effet pour pousser l'état réactif vers quelque chose que le framework ne gère pas : un
graphique, une carte, un lecteur média, un appel d'analytics, un abonnement WebSocket qui dépend
d'un signal.

**Pas pour dériver un état.** Un effet qui écrit un signal à partir d'autres signaux est un memo
écrit en plus long, avec un temps de retard :

```ts
// ✗
effect(() => fullName.set(`${first()} ${last()}`));
// ✓
const fullName = memo(() => `${first()} ${last()}`);
```

**Pas pour écrire un signal qu'il lit.** Il se déclenche lui-même ; lisez-le avec `untrack` si
vous avez besoin de sa valeur actuelle.

**Pas pour mettre à jour la page.** `{count()}`, `class={...}` et les autres expressions JSX
mettent déjà à jour le nœud exact ; un effet qui écrit `textContent` refait le travail du
framework.

**Pas pour charger des données.** Une [ressource](/v1/fr/async) ou le `routeData` de la route
charge les données, suit le chargement et les erreurs, et envoie le résultat avec le rendu
serveur ; un effet qui appelle `fetch` ne fait rien de tout cela.

**Pas pour l'en-tête ni le stockage.** `seo()` tient le titre et les balises meta à jour
([SEO](/v1/fr/seo)), et `persisted` garde un signal dans le stockage ([Stockage](/v1/fr/storage)),
y compris sur le serveur.

## Sous le capot

Un effet est un nœud du graphe réactif sans lecteur à lui. Quand une de ses sources change, il est
mis en file et exécuté de façon synchrone après l'écriture, ou à la fin du `batch`. Les effets
créés par un composant appartiennent à son propriétaire et disparaissent avec lui, nettoyages
compris.

Suivant : **[Les stores](/v1/fr/stores)**.
