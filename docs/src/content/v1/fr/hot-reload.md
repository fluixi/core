# Rechargement à chaud

Avec `fluixi dev`, enregistrer un composant le remplace dans la page sans la recharger. Ses
instances se rendent à nouveau avec le nouveau code ; tout ce qui les entoure reste en l'état :
les signaux des autres composants, le texte saisi dans un formulaire, la position de défilement,
les menus ouverts.

Rien à configurer. Un build de production n'en contient rien.

## Ce que fait un enregistrement

Fluixi décide fichier par fichier, d'après ce que le fichier exporte.

| Le fichier | À l'enregistrement |
|---|---|
| n'exporte que des composants, plus le `routeData`, le `routeDeps` et le `default` d'une route | remplacé sur place |
| un utilitaire importé par un composant (`format.ts`) | le composant qui l'importe est remplacé |
| crée un état au niveau du module (`const theme = signal('dark')`) | celui qui l'importe est remplacé, et l'état repart de zéro |
| définit des éléments avec `defineElement` | les éléments sont reconstruits sur place |
| enregistre une classe d'élément avec `defineCustomElement` | la classe est mise à jour sur place, voir plus bas |
| enregistre une classe avec `customElements.define` | la page se recharge |
| commence par `// @refresh reload` | la page se recharge |

Un composant est une fonction dont le nom commence par une majuscule et contient une minuscule :
`Card` en est un, `GET` et `MAX_ITEMS` non. Un fichier qui exporte autre chose est pris en
charge par le premier fichier au-dessus de lui capable de se remplacer.

Le code serveur n'a besoin d'aucun rechargement : chaque requête exécute le point d'entrée
serveur, les middlewares, les routes d'API et les fonctions serveur dans leur version actuelle.

## Données de route

Modifier le `routeData` d'une route recharge les données des routes affichées, sans recharger la
page. Le nouveau chargeur s'exécute ; une entrée de `cache()` encore fraîche répond comme avant,
donc changez sa clé ou appelez `revalidate` si c'est la valeur en cache que vous avez modifiée.

## Garder l'état du composant modifié

Par défaut, le composant que vous avez modifié repart de zéro : ses propres signaux reviennent à
leur valeur initiale. Pour les garder, activez `keepState` :

```ts
// fluixi.config.ts
export default defineConfig({
  vitePlugin: { hot: { keepState: true } },
});
```

Signaux et stores sont associés dans l'ordre où le corps du composant les crée. Si la nouvelle
version en crée le même nombre, chacun repart de la valeur qu'avait l'ancien. Les composants
rendus à l'intérieur gardent aussi les leurs, associés par leur position, tant que c'est le même
composant qui s'y trouve.

Quand l'ordre n'est plus fiable, le composant repart de zéro :

- le corps crée désormais un nombre différent de signaux ou de stores ;
- un autre composant occupe la position d'un enfant.

Deux signaux intervertis dans le source échangent leurs valeurs, puisque seul l'ordre est connu.
Les signaux créés plus tard (dans un gestionnaire d'événement, un effet, une branche affichée
après le premier rendu) n'appartiennent pas au corps et ne sont pas gardés.

Pour qu'un fichier reparte toujours de zéro, commencez-le par :

```ts
// @refresh reset
```

## Éléments personnalisés

Un élément créé avec `defineElement` est reconstruit sur place : le même élément dans la page,
ses props conservées, rendu à partir de la nouvelle fonction. Avec `keepState`, ses signaux sont
gardés comme ceux d'un composant.

Une classe d'élément enregistrée avec `defineCustomElement` est elle aussi mise à jour sur place.
Le navigateur garde la première classe reçue pour une balise : les nouvelles méthodes sont donc
reportées sur cette classe, et chaque élément se rend à nouveau. L'élément lui-même n'est pas
recréé, ses champs gardent leur valeur. Deux cas rechargent la page à la place :

- la classe a des champs ou des méthodes `#private` : chaque enregistrement crée de nouveaux
  noms privés, que les éléments existants n'ont pas ;
- la classe est enregistrée directement avec `customElements.define` plutôt qu'avec
  `defineCustomElement`.

Un champ ajouté dans la nouvelle version vaut `undefined` sur les éléments créés avant lui,
jusqu'au rechargement de la page.

## Le désactiver

```ts
// fluixi.config.ts
export default defineConfig({
  vitePlugin: { hot: false },
});
```

Chaque enregistrement recharge alors la page. Pour un seul fichier, `// @refresh reload` en tête
du fichier fait de même.

## Dans les devtools

Chaque remplacement forme un commit dans la chronologie des devtools, à son nom :
`hot update: Card (src/components/card.tsx)`. Les effets exécutés et les nœuds créés et supprimés
sont listés dessous. Les éléments reconstruits sont brièvement entourés dans la page.
