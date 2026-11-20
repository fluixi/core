# Dépannage

Ce que Fluixi affiche quand quelque chose ne va pas, ce que cela veut dire, et quoi changer. Les
messages commencent par `[fluixi]` (ou `[fluixi/di]`, `[fluixi/env]`) : faciles à trouver dans la
console ou le terminal.

## Rien ne se met à jour

Aucun message, mais la page ne change pas quand l'état change.

| Cause | Correction |
|---|---|
| Un signal lu une fois hors du JSX : `const n = count();` puis `{n}` | lisez-le là où il s'affiche : `{count()}` |
| Un tableau ou un objet modifié sur place, puis réécrit | écrivez-en un nouveau : `items.set(l => [...l, x])` ([Les signaux](/v1/fr/signals)) |
| Un simple `if` ou un `return` anticipé dans le corps du composant | `<Show>` ([Le flux de contrôle](/v1/fr/control-flow)) |
| Une prop déstructurée dans un bloc imbriqué | lisez `props.x` là où vous l'utilisez ; le compilateur signale ce cas (plus bas) |
| Un signal lu dans `onMount` | `onMount` ne suit rien ; utilisez un effet |

## Rendu et hydratation

**`[fluixi] hydration mismatch: expected ... but the server DOM has ...`**
Le serveur et le navigateur ont produit un balisage différent à cet endroit. Le navigateur répare,
mais la cause est en général une valeur qu'un seul côté connaît : `Date.now()`, `Math.random()`,
`window`, `localStorage`, un test de navigateur dans le rendu. Prenez la valeur dans les données,
fixez-la dans `onMount`, ou enveloppez la partie dans `<ClientOnly>`. Affiché en développement
seulement.

**`[fluixi] SSR render failed — falling back to client render: ...`** (terminal)
Le rendu serveur a levé une erreur : la page a été rendue par le navigateur à la place. Lisez
l'erreur en dessous. Les causes habituelles sont une API du navigateur utilisée pendant le rendu
(`document`, `window`, `localStorage`), souvent dans un effet, qui s'exécute aussi sur le serveur
([Les effets](/v1/fr/effects)).

**`[fluixi] hydration: removed N server element(s) the client did not render.`**
Le premier rendu du navigateur a produit moins d'éléments que celui du serveur. Mêmes causes qu'une
différence d'hydratation.

## Le compilateur

**`[fluixi] <file>: <Name> is not defined: nothing imports it and no resolve rule supplies it.`**
La balise n'afficherait rien. Importez le composant, ou ajoutez une règle `resolve` pour son
dossier ([Résolution des composants](/v1/fr/component-resolution)).

**`` [fluixi] <file>: `name` was left destructured: ... It reads once instead of tracking. ``**
Une déstructuration de `props` que le compilateur n'a pas pu réécrire sans risque (dans un bloc,
dans un `const` partagé, réaffectée). Lisez `props.name` là où vous l'utilisez
([Composants](/v1/fr/components)).

**`[fluixi] <file>: $signal is reserved for the compiler, and this module binds it.`**
Une variable locale nommée comme un intrinsèque le masque. Renommez la variable.

**``html`` was not compiled, enable the html format: fluixi({ format: 'html' }).``**
Un template html`` est arrivé non compilé dans le navigateur. Activez le format, ou chargez le
build CDN qui compile les templates dans la page ([CDN](/v1/fr/cdn)).

**`html template (12:5): Unclosed <span>`** (erreur de build)
Le balisage d'un template est cassé ; le message nomme l'élément resté ouvert, à sa position dans
le fichier.

## Stratégies de chargement

**`[fluixi] <file>: load:idle has no effect on <Heavy>: Heavy is used as a value here, ...`**
**`[fluixi] <file>: load:never has no effect on <Heavy>: <Heavy> is also rendered without load: in this file, ...`**
Un composant différé à un endroit est utilisé immédiatement (ou comme valeur) dans le même fichier :
son code part quand même. Différez chaque usage, ou déplacez l'usage immédiat dans un autre fichier
([Stratégies de chargement](/v1/fr/load-strategies)).

**`'load:visible' needs a literal value`** (erreur de build)
`load:` prend une valeur littérale : `load:visible="200px"`, pas `load:visible={margin}`.

## Injection de dépendances

**`[fluixi/di] inject() called outside an injection context (after an await? in an event handler?).`**
`inject()` s'est exécuté là où il n'y a ni composant, ni requête, ni injecteur : après un `await`
dans le navigateur, dans un gestionnaire d'événement, au chargement du module. Injectez pendant la
mise en place et gardez la valeur, ou gardez l'injecteur (`getInjector()`) et utilisez
`runInInjectionContext()` ([Injection de dépendances](/v1/fr/dependency-injection)).

**`[fluixi/di] No provider for "Token" (...)`**
Rien ne fournit ce jeton. Ajoutez-le aux `providers` d'un module de l'application, appelez
`provide()` dans un composant au-dessus, ou donnez une `factory` au jeton.

**`[fluixi/di] provideAppInitializer() was registered after the app started rendering, ...`**
L'initialiseur a été enregistré depuis le module d'une route. Enregistrez-le dans `app.config.ts`
ou dans l'entrée, pour qu'il s'exécute avant le premier rendu.

## Environnement et code serveur

**`... reads NAME in code the browser runs`** (erreur de build ou de dev)
Du code navigateur lit une variable absente de `env.public`. Déclarez-la publique si elle peut être
vue, ou lisez-la côté serveur (une route d'API, une fonction serveur, un fichier `*.server.ts`)
([Environnement](/v1/fr/environment)).

**`[fluixi/env] NAME is listed in env.public, which puts the value in the browser bundle.`** (refusé)
Un nom public ressemble à un secret. Retirez-le de `env.public` et lisez-le avec `serverEnv()` côté
serveur. S'il n'en a que l'air, fixez `FLUIXI_ALLOW_PUBLIC_SECRETS=true`.

**`... imports src/.../db.server.ts into the browser bundle.`** (erreur de build)
Un fichier `*.server.*` est importé depuis du code navigateur. Importez-le depuis une route d'API,
un middleware, `src/app.config.server.ts` ou une fonction serveur.

**`[fluixi/env] serverEnv("NAME") was called in a browser.`**
`serverEnv` est réservé au code serveur.

**`middleware called next() more than once`**
Un middleware appelle `next()` deux fois ; appelez-le une fois et renvoyez son résultat.

## Routage

**`[fluixi] a.tsx and b.tsx in src/routes answer the same address: only the first renders.`**
Deux fichiers de route répondent aux mêmes URL (`[a].tsx` et `[b].tsx` côte à côte). Renommez-en
un, ou déplacez-le dans son propre dossier.

## Éléments personnalisés

**`[fluixi] <x-card> has children between its tags that its render() does not place, so they are not shown.`**
Un élément en light DOM doit placer lui-même ses enfants : `this.authoredChildren` ou
`this.slotted('name')` dans `render()`. Un `<slot>` ne fonctionne qu'avec le shadow DOM
([Web components](/v1/fr/web-components)).

**`[fluixi] NAME is not a declared prop of <x-card>`**
La page fixe une propriété que l'élément ne déclare pas. Ajoutez-la aux props de l'élément, ou
corrigez le nom.

## Rechargement à chaud

**`[fluixi] <file>: Name is not a component, so the page reloads.`**
Un export en majuscule qui n'est pas une fonction (une constante, un contexte) ne peut pas être
remplacé : la page se recharge. Déplacez-le dans son propre fichier pour garder le fichier du
composant remplaçable ([Rechargement à chaud](/v1/fr/hot-reload)).

## Toujours bloqué

Les devtools montrent le graphe réactif et une chronologie de ce que chaque écriture a provoqué :
quel effet s'est exécuté, quels nœuds ont été créés et détruits. C'est en général ce qui montre
pourquoi quelque chose ne s'est pas mis à jour, ou trop souvent.
