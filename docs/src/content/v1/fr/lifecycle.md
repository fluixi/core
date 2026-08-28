# Le cycle de vie

Les composants ne se réaffichent pas ; le « cycle de vie » se résume donc à quelques primitives
liées à l'arbre de propriété réactif.

## onMount

Exécuter du code une fois, après que le DOM du composant est en place (côté client uniquement — ne
s'exécute jamais pendant le SSR) :

```tsx
import { onMount } from 'fluixi';

onMount(() => {
  inputRef.focus();
});
```

## onCleanup

Exécuter du code lorsque la portée propriétaire est détruite (et avant qu'un effet ne se ré-exécute) :

```tsx
import { onCleanup } from 'fluixi';

const id = setInterval(tick, 1000);
onCleanup(() => clearInterval(id));
```

## Les refs

Obtenir le nœud DOM sous-jacent avec `ref` :

```tsx
let el!: HTMLInputElement;
<input ref={(node) => (el = node)} />;
// ou simplement : <input ref={el} />
```

Suivant : **[Le routage](/v1/fr/routing)**.
