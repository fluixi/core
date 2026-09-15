# Stratégies de chargement

`resolve` dit **d'où** vient un composant. `load:` dit **quand** son code doit être
récupéré.

Les deux sont séparés parce qu'ils varient indépendamment. L'emplacement de
`<RevenueChart>` est le même partout et relève de la configuration ; savoir si *cette
utilisation-ci* doit attendre le viewport est une propriété de l'utilisation.

```tsx
<Summary total={total()} />                    {/* eager, chunk d'entrée */}
<ExportDialog load:interaction />              {/* chunk dédié, à la première interaction */}
<AuditLog load:media="(min-width: 1024px)" />  {/* chunk dédié, bureau uniquement */}
<RevenueChart load:visible="200px" />          {/* chunk dédié, juste avant l'affichage */}
```

Pas d'import, pas de `lazy()`, pas de composant enveloppe. Le compilateur émet l'import
dynamique et la liaison différée.

## Les stratégies

| Directive | Quand le module est récupéré |
| --- | --- |
| `load:eager` | Immédiatement, dans le chunk parent. Le défaut. |
| `load:idle` | Quand le navigateur devient inactif. |
| `load:visible` | Quand l'élément approche du viewport. |
| `load:interaction` | À la première interaction avec l'élément. |
| `load:media` | Quand une media query correspond. |
| `load:never` | Jamais, aucun code client. |

### `load:visible`

Accepte une marge optionnelle, transmise comme `rootMargin` de l'observateur :

```tsx
<RevenueChart load:visible />          {/* à l'intersection */}
<RevenueChart load:visible="200px" />  {/* 200px en avance */}
```

Préférez la marge. Démarrer la récupération exactement à l'intersection revient à faire
attendre l'utilisateur devant un espace vide pendant que le réseau travaille.

### `load:interaction`

Par défaut `pointerdown`, `focusin` et `keydown`, les trois qui précèdent de façon fiable
une véritable interaction, au clavier comme au pointeur. Nommez les vôtres pour restreindre :

```tsx
<ExportDialog load:interaction />
<ExportDialog load:interaction="pointerdown" />
```

### `load:media`

La requête est obligatoire, faute de défaut sensé :

```tsx
<AuditLog load:media="(min-width: 1024px)" />
```

### `load:never`

L'affirmation que le composant n'a aucune place dans le bundle client, sortie rendue côté
serveur uniquement. Contrairement aux autres, ce n'est pas une question de timing : elle
n'est donc jamais rétrogradée (voir plus bas), et l'associer à une utilisation eager du
même module est signalé comme la contradiction que c'est.

## La stratégie doit être statique

`load:` est lue à la compilation, car elle décide comment le module est émis. Une valeur
d'exécution ne peut pas y répondre : un trou `${...}` est donc rejeté plutôt qu'ignoré en
silence.

## Différer pour rien n'est pas gratuit

Si un module est déjà dans le chunk parent, parce qu'autre chose l'utilise en eager, le
différer ailleurs n'apporte rien et coûte une enveloppe, une promesse et un rendu
supplémentaire. Le compilateur le remarque et rétrograde ces références en eager.

La rétrogradation se fait par **module**, pas par nom de composant : `<Button>` en eager et
`<ButtonGroup load:visible>` depuis le même paquet signifient que le paquet est déjà
chargé, différer le second ne sert donc à rien.

## Le vérifier

Le rendu passe dans les deux cas : une assertion doit donc porter sur la sortie de build,
dans quel chunk chaque composant a atterri. `examples/load-strategies` dans le dépôt fait
exactement cela : il lance une vraie compilation et vérifie que les trois composants
différés sont dans leurs propres chunks et absents de l'entrée.
