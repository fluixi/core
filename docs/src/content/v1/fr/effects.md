# Les effets

Un **effet** exécute un effet de bord — manipulation du DOM, journalisation, appels réseau — et se
ré-exécute dès que ses lectures réactives changent. Créez-en un avec `createEffect` :

```ts
import { createSignal, createEffect } from '@fluixi/reactive/signal';

const [theme, setTheme] = createSignal('dark');

createEffect(() => {
  document.body.dataset.theme = theme(); // se ré-exécute quand theme change
});
```

L'effet s'exécute une fois immédiatement pour établir ses dépendances, puis à chaque changement.

## Nettoyage

Enregistrez un nettoyage avec `onCleanup`. Il s'exécute avant la ré-exécution de l'effet et lors de
sa destruction — idéal pour les minuteurs, écouteurs et abonnements :

```ts
import { onCleanup } from '@fluixi/reactive/signal';

createEffect(() => {
  const id = setInterval(tick, delay());
  onCleanup(() => clearInterval(id)); // nettoyé avant la prochaine exécution / à la destruction
});
```

## Valeur précédente

La fonction d'effet reçoit sa valeur de retour précédente, pour comparer d'une exécution à l'autre :

```ts
createEffect((prev) => {
  const value = count();
  if (prev !== value) report(prev, value);
  return value;
});
```

## Regroupement (batch)

Plusieurs écritures dans `batch` ne notifient les dépendants qu'**une fois**, après le lot :

```ts
import { batch } from '@fluixi/reactive/signal';

batch(() => {
  setFirst('Grace');
  setLast('Hopper');
}); // les effets dépendant des deux s'exécutent une seule fois
```

Suivant : **[Les stores](/v1/fr/stores)**.
