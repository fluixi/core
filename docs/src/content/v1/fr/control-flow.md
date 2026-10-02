# Le flux de contrôle

Utilisez les composants de flux de contrôle plutôt que des `if`/`map` bruts dans le balisage : ils
gardent les mises à jour fines et ne touchent que le DOM qui change.

## Show

Afficher conditionnellement une branche :

```tsx
import { Show } from '@fluixi/core';

<Show when={user()} fallback={<a href="/login">Se connecter</a>}>
  <p>Bon retour, {user()!.name}</p>
</Show>;
```

## For

Afficher une liste, indexée par référence, pour déplacer les lignes plutôt que les recréer :

```tsx
import { For } from '@fluixi/core';

<For each={items()}>
  {(item) => <li>{item.label}</li>}
</For>;
```

Utilisez plutôt `Index` lorsque vous indexez par position et non par identité.

## Switch / Match

Pour plusieurs branches exclusives :

```tsx
import { Switch, Match } from '@fluixi/core';

<Switch fallback={<NotFound />}>
  <Match when={route() === 'home'}><Home /></Match>
  <Match when={route() === 'about'}><About /></Match>
</Switch>;
```

## Sur un élément

Les mêmes branches et listes peuvent se poser sur un élément en attributs, `if`, `else`, `each` et
`key`, ou sur `<container>` quand aucun élément ne doit s'ajouter. Le compilateur les transforme en
composants ci-dessus. Voir [le contrôle de flux dans les directives](/v1/fr/directives#contrôle-de-flux).

```tsx
<ul each={rows()}>{(row: Row) => <li>{row.name}</li>}</ul>
<p if={user()}>Welcome back</p>
<container else><a href="/login">Sign in</a></container>
```

Sur une balise en minuscules, TypeScript ne peut pas inférer l'élément : annotez-le, ou utilisez
`<For>` là où le type doit être inféré. Dans une application construite par `@fluixi/start`,
`Show`, `For`, `Index`, `Switch` et `Match` n'ont pas besoin d'import.

Suivant : **[Le cycle de vie](/v1/fr/lifecycle)**.
