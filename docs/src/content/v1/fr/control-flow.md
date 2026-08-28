# Le flux de contrôle

Utilisez les composants de flux de contrôle plutôt que des `if`/`map` bruts dans le balisage : ils
gardent les mises à jour fines et ne touchent que le DOM qui change.

## Show

Afficher conditionnellement une branche :

```tsx
import { Show } from 'fluixi';

<Show when={user()} fallback={<a href="/login">Se connecter</a>}>
  <p>Bon retour, {user()!.name}</p>
</Show>;
```

## For

Afficher une liste, indexée par référence, pour déplacer les lignes plutôt que les recréer :

```tsx
import { For } from 'fluixi';

<For each={items()}>
  {(item) => <li>{item.label}</li>}
</For>;
```

Utilisez plutôt `Index` lorsque vous indexez par position et non par identité.

## Switch / Match

Pour plusieurs branches exclusives :

```tsx
import { Switch, Match } from 'fluixi';

<Switch fallback={<NotFound />}>
  <Match when={route() === 'home'}><Home /></Match>
  <Match when={route() === 'about'}><About /></Match>
</Switch>;
```

Suivant : **[Le cycle de vie](/v1/fr/lifecycle)**.
