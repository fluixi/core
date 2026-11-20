# Le flux de contrôle

Un composant s'exécute une fois : un simple `if` dans son corps est décidé une fois pour toutes.
Les conditions et les listes qui changent passent par des composants de flux de contrôle : ils
gardent ce qui reste, et ne construisent ou ne retirent que ce qui a changé.

Dans une application construite par `@fluixi/start`, `Show`, `For`, `Index`, `Switch`, `Match`,
`Dynamic` et `Portal` n'ont pas besoin d'import ; ailleurs, et pour `ClientOnly` partout,
importez-les depuis `@fluixi/core`.

## Show

Une condition :

```tsx
<Show when={user()} fallback={<a href="/login">Se connecter</a>}>
  <p>Bon retour</p>
</Show>
```

Quand les enfants ont besoin de la valeur, passez une fonction ; elle reçoit la valeur, déjà
vérifiée :

```tsx
<Show when={user()}>{(u) => <p>Bon retour, {u.name}</p>}</Show>
```

Des enfants simples sont construits une fois tant que la condition reste vraie. Un enfant fonction
s'exécute à nouveau chaque fois que `when` devient une valeur vraie **différente** (un nouvel
objet), et construit une nouvelle branche.

## Switch et Match

Plusieurs branches exclusives ; le premier `Match` dont `when` est vrai l'emporte :

```tsx
<Switch fallback={<p>Statut inconnu</p>}>
  <Match when={order().status === 'paid'}><Paid /></Match>
  <Match when={order().status === 'shipped'}><Shipped /></Match>
  <Match when={order().status === 'refunded'}><Refunded /></Match>
</Switch>
```

## For

Une liste d'objets. La fonction de ligne s'exécute une fois par élément ; quand la liste change,
les lignes sont ajoutées, retirées et déplacées, pas reconstruites :

```tsx
<For each={todos()} fallback={<p>Rien à faire</p>}>
  {(todo, i) => <li>{i() + 1}. {todo.title}</li>}
</For>
```

Par défaut, un élément est reconnu par sa référence d'objet. Des données rechargées depuis une API
arrivent à chaque fois sous forme de nouveaux objets, ce qui reconstruirait toutes les lignes ;
donnez une clé à `by`, et la même clé garde sa ligne, son DOM et son focus. Avec `by`, l'élément
est un accesseur, puisque son contenu peut changer sous la même clé :

```tsx
<For each={todos()} by={(t) => t.id}>
  {(todo) => <li class={todo().done ? 'done' : ''}>{todo().title}</li>}
</For>
```

## Index

Une liste où la position compte plus que l'élément : des primitives, un ensemble fixe
d'emplacements, une grille. Chaque emplacement est construit une fois, et l'élément à cette
position est un accesseur qui change :

```tsx
<Index each={scores()}>
  {(score, i) => <td>{i + 1} : {score()}</td>}
</Index>
```

## Dynamic

Quand le composant ou la balise elle-même change :

```tsx
const views = { grid: GridView, list: ListView };
<Dynamic component={views[mode()]} items={items()} />
<Dynamic component={level() === 1 ? 'h1' : 'h2'}>{title()}</Dynamic>
```

Une nouvelle prop met à jour le composant courant sur place ; un nouveau composant ou une nouvelle
balise le remplace.

## ClientOnly

Un sous-arbre qui ne peut pas être rendu sur le serveur (il lit `window`, `localStorage`, le fuseau
horaire). Le serveur et l'hydratation affichent `fallback` ; les enfants sont construits dans le
navigateur juste après :

```tsx
import { ClientOnly } from '@fluixi/core';

<ClientOnly fallback={<div class="map-placeholder" />}>
  <Map center={center()} />
</ClientOnly>
```

## Portal

Affiche ailleurs dans le document, une boîte de dialogue ou une infobulle, tout en restant partie
du composant qui le possède : son contexte, et son nettoyage quand ce composant s'en va.

```tsx
<Portal mount={document.getElementById('modal-root')!}>
  <Dialog />
</Portal>
```

Sans `mount`, il va à la fin de `document.body`. Sur le serveur, un portail n'affiche rien ; dans
le navigateur, son contenu se monte une fois la page hydratée.

## Sur un élément

Les mêmes branches et listes peuvent se placer sur un élément sous forme d'attributs, `if`,
`else`, `each` et `key`, ou sur `<container>` quand aucun élément ne doit être ajouté. Le
compilateur les transforme en composants ci-dessus. Voir
[Le flux de contrôle dans les directives](/v1/fr/directives#control-flow).

```tsx
<ul each={rows()}>{(row: Row) => <li>{row.name}</li>}</ul>
<p if={user()}>Bon retour</p>
<container else><a href="/login">Se connecter</a></container>
```

Sur une balise en minuscules, TypeScript ne peut pas déduire le type de l'élément : annotez-le, ou
utilisez `<For>` quand le type doit être déduit.

## Quoi utiliser, et quoi ne pas écrire

| Vous avez | Utilisez |
|---|---|
| une condition | `Show` |
| plusieurs cas exclusifs | `Switch` / `Match` |
| une liste d'objets | `For`, avec `by` quand les objets sont recréés |
| des primitives ou des emplacements fixes | `Index` |
| un composant ou une balise choisi à l'exécution | `Dynamic` |
| un contenu propre au navigateur | `ClientOnly` |
| un contenu placé ailleurs dans la page | `Portal` |

**Pas `cond() && <X />` pour quoi que ce soit qui a un état ou un coût.** L'expression est une
seule insertion réactive : chaque fois qu'elle se réexécute, même si la condition reste vraie,
elle détruit `X` et le reconstruit, nettoyages compris.

```tsx
// ✗ reconstruit à chaque changement de n, même s'il reste positif
{n() > 0 && <Badge count={n()} />}
// ✓ construit une fois tant que la condition tient ; le compteur se met à jour sur place
<Show when={n() > 0}><Badge count={n()} /></Show>
```

**Pas `.map()` pour une liste qui change.** Il reconstruit toutes les lignes à chaque changement :

```tsx
// ✗ toutes les lignes reconstruites quand on en ajoute une
{todos().map((t) => <li>{t.title}</li>)}
// ✓ seule la nouvelle ligne est construite
<For each={todos()} by={(t) => t.id}>{(t) => <li>{t().title}</li>}</For>
```

**Pas de `return` anticipé dans le corps du composant.** Il s'exécute une fois :

```tsx
// ✗ décidé une fois : se connecter plus tard n'affiche jamais le tableau de bord
if (!user()) return <Login />;
// ✓
<Show when={user()} fallback={<Login />}><Dashboard /></Show>
```

**Pas une fonction de rappel comme `when`.** `when` accepte une fonction comme accesseur et
l'appelle ; pour tester si un rappel a été passé, utilisez `when={!!props.onClose}`.

## Sous le capot

Chaque composant de flux de contrôle est un memo sur sa condition ou sa liste. `Show` et `Switch`
construisent une branche sous son propre propriétaire et détruisent ce propriétaire quand la
branche change. `For` garde une table de l'élément (ou de la clé) vers la ligne, et à chaque
changement calcule les lignes à ajouter, retirer et déplacer : les nœuds DOM des lignes inchangées
sont déplacés, jamais recréés ; `Index` garde une ligne par position et met à jour le signal de
l'élément de chacune. Tous sont rendus sur le serveur et repris sur place à l'hydratation.

Suivant : **[Le cycle de vie](/v1/fr/lifecycle)**.
