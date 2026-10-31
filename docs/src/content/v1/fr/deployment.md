# Déploiement

Une application Fluixi compilée est un **gestionnaire fetch neutre vis-à-vis du runtime** :
`(Request) => Promise<Response>`. Tout ce qui est spécifique à une plateforme est un
adaptateur autour de cette unique fonction.

```
fluixi build     →  dist/client  (assets, pages prérendues)
                    dist/server  (le gestionnaire)
fluixi start     →  le sert avec l'adaptateur node
```

## Les trois formes

**Un site statique.** Avec [`prerender`](/v1/fr/static-generation), chaque route est écrite
dans `dist/client` en HTML. Envoyez ce dossier n'importe où, il n'y a aucun serveur à faire
tourner.

**Un serveur Node.** `fluixi start` lance l'adaptateur node : il écoute sur un port et sert
`dist/client` depuis le disque, en repassant au gestionnaire pour ce qui n'est pas trouvé.
C'est le comportement par défaut, sans configuration.

Le port est le premier défini parmi : `--port` (`fluixi start --port=8080`), la variable `PORT`
que fournissent la plupart des hébergeurs, `port` dans `fluixi.config.ts`, puis 3000. `fluixi dev`
les lit de la même façon.

**Un runtime edge ou serverless.** Ces plateformes ne veulent pas d'un processus qui écoute,
mais d'un module exportant `fetch`. C'est ce que renvoie l'adaptateur web :

```ts
import { createProdHandler, webAdapter } from '@fluixi/start';

const handler = await createProdHandler(/* ... */);

export default webAdapter.serve({ handler, cfg, clientDir });
// → { fetch: (request) => Promise<Response> }
```

La plateforme sert elle-même les assets statiques, généralement depuis son CDN :
l'adaptateur n'a donc qu'à transmettre le gestionnaire.

## Désigner la cible

Déclarer l'adaptateur dans `fluixi.config.ts` est ce qui indique au **build** où part
l'application :

```ts
import { defineConfig } from '@fluixi/start/config';
import { nodeAdapter } from '@fluixi/start/adapter';

export default defineConfig({
  adapter: nodeAdapter,
});
```

`fluixi start` sert lui aussi avec cet adaptateur, avec `webAdapter`, il n'a rien à lancer,
et le dit plutôt que de faire semblant d'avoir démarré.

## Comment le serveur est bundlé

Les deux cibles attendent l'inverse l'une de l'autre de `dist/server` : l'adaptateur porte
donc un mode `bundle`, que `fluixi build` applique.

| `bundle` | `dist/server` | a besoin de `node_modules` à l'exécution |
| --- | --- | --- |
| `'external'` (node) | votre application plus `import '@fluixi/core'` | oui |
| `'inline'` (web) | un seul fichier autonome | non |
| non défini (aucun adaptateur) | l'heuristique de Vite | en général |

Un processus Node de longue durée tourne depuis le dossier de l'application, où les
dépendances sont déjà installées : copier le framework dans le bundle ne fait que ralentir le
build. Sur l'application `examples/start-app`, cela donne un `dist/server/entry-server.js` de
**4,6 Ko au lieu de 76 Ko**, le code de l'application et rien d'autre, et un build complet
qui passe de 1,9 s à 0,8 s. Le HTML rendu est identique octet pour octet dans les deux cas.

Un runtime edge ou serverless est le cas inverse : vous envoyez un fichier, pas une
installation, rien ne doit rester à résoudre, et `'inline'` met tout dans le bundle.

`'external'` externalise les paquets `@fluixi/*` **que votre application déclare en
dépendances**, et rien d'autre. Avec une disposition stricte de `node_modules` (pnpm), un
paquet que vous n'avez jamais déclaré n'est pas résolvable depuis la racine de
l'application : l'externaliser produirait un bundle important quelque chose que Node ne
trouve pas. Chaque paquet est listé avec tous les sous-chemins qu'il exporte, car
l'externaliser à moitié, `@fluixi/core` en import, `@fluixi/core/router` copié dans le
bundle, mettrait deux routeurs, et deux états de module, dans le même serveur.
`ssrNoExternal` reste prioritaire sur tout cela, c'est l'application qui dit « celui-ci,
bundle-le quand même ».

> Seul le build lit `bundle`. Le dev n'externalise jamais : `fluixi dev` charge les modules
> serveur via Vite pour que leur édition déclenche toujours le HMR.

## Un seul exemplaire d'un paquet

`fluixi dev` et `fluixi build` résolvent les paquets du framework une seule fois, depuis la racine
de l'application : une bibliothèque installée avec son propre `@fluixi/core` partage quand même
celui de l'application. Une bibliothèque à vous qui porte un contexte a besoin de la même chose
quand une installation peut en donner deux exemplaires (un dépôt lié, deux versions d'une
dépendance pair sous elle) : listez-la dans `dedupe`.

```ts
export default defineConfig({
  dedupe: ['@fluixi-ui/theme'],
});
```

Deux exemplaires d'un fournisseur de thème, c'est un menu qui lit l'un pendant que la page écrit
dans l'autre : la lecture échoue comme si le fournisseur manquait.

## Du code chargé à l'exécution

Un déploiement peut charger du code avec lequel l'application n'a pas été construite : des
plugins montés dans le conteneur, par exemple. Ce code importe `@fluixi/core` par son nom, et
il doit obtenir la copie de l'application, sinon il fait tourner un second runtime réactif, un
second injecteur et un second registre d'éléments. `share` liste les modules que l'application
lui confie, chacun tel que le code l'importe, un sous-chemin sur sa propre ligne :

```ts
export default defineConfig({
  adapter: nodeAdapter,
  share: ['@fluixi/core', '@fluixi/reactive/signal', '@fluixi/di', '@acme/sdk/view'],
});
```

- **Dans le navigateur**, chaque module devient son propre chunk avec tous ses exports, et une
  import map le nomme : en tête du `<head>` du document, et dans `dist/client/share.json` pour
  une page que l'application ne rend pas elle-même.
- **Sur le serveur**, les paquets restent externes : un fichier importé depuis le dossier de
  l'application les résout depuis son `node_modules`, les mêmes copies que celles de
  l'application. Il faut pour cela un bundling `'external'` : `share` avec l'adaptateur web,
  ou sans adaptateur, est refusé au build.

Un module partagé est gardé entier, puisque l'application ne peut pas savoir quels exports le
code chargé utilisera. Une application Vite simple obtient la partie navigateur avec `share()`
de `@fluixi/vite-plugin`.

## Les plateformes hébergées

Trois adaptateurs produisent la disposition que leur plateforme lit. Chacun inline le
framework et renvoie un gestionnaire `fetch` ; ce qui change, c'est l'endroit où va le
point d'entrée et ce qui déclare le routage.

```ts
import { cloudflareAdapter } from '@fluixi/start/adapter';
// ou netlifyAdapter, vercelAdapter

export default defineConfig({ adapter: cloudflareAdapter });
```

| | ce que `fluixi build` écrit | ce que vous déployez |
| --- | --- | --- |
| `cloudflareAdapter` | `dist/client/_worker.js` + `_routes.json` | publiez `dist/client` |
| `netlifyAdapter` | `.netlify/functions-internal/fluixi-server.mjs` | publiez `dist/client` |
| `vercelAdapter` | `.vercel/output/` (Build Output API v3) | rien, Vercel le lit directement |

Chacun sert d'abord les fichiers statiques et n'atteint le serveur qu'en cas d'absence :
Cloudflare via le binding `ASSETS`, Netlify via `preferStatic`, Vercel via une route
`filesystem` placée avant la fonction. Une page prérendue est un fichier, et le reste.

Le point d'entrée est généré puis bundlé en un seul fichier, sans chunks. Sur Cloudflare
ce n'est pas un choix de taille : le worker est écrit dans le dossier que vous publiez,
donc un chunk séparé serait un morceau de votre serveur téléchargeable publiquement.

Une application sans point d'entrée serveur (une SPA entièrement prérendue) reçoit la
sortie statique seule, ce n'est pas un échec, il n'y a rien à envelopper.

## Écrire un adaptateur

Un adaptateur, c'est un nom, une fonction `serve`, et éventuellement le mode de bundling
qu'exige sa plateforme :

```ts
import type { Adapter } from '@fluixi/start';

export const myAdapter: Adapter = {
  name: 'ma-plateforme',
  bundle: 'inline',
  serve({ handler, cfg, clientDir }) {
    // Soit prendre le contrôle du processus, écouter, bloquer, ne jamais rendre la main,
    // soit renvoyer { fetch } pour que la plateforme l'invoque.
    return { fetch: handler };
  },
};
```

`serve` reçoit le gestionnaire, la configuration résolue et le dossier client compilé. Un
runtime avec système de fichiers utilise `clientDir` pour servir les assets ; un runtime
edge l'ignore, la plateforme s'en chargeant déjà.

Un adaptateur peut aussi produire la disposition de sortie de la plateforme, via un
hook `build` optionnel exécuté après le build client, le build serveur et le prérendu.
`bundleEntry` inline le bundle serveur et le gabarit HTML dans un seul fichier : les
deux doivent être inlinés plutôt que lus, puisque `createProdHandler` lit `index.html`
sur le disque et importe l'entrée serveur par chemin, exactement ce qu'un worker ne
peut pas faire. L'entrée générée les importe statiquement et appelle
`createHandlerFrom` : même gestionnaire, même ordre de dispatch, aucun système de
fichiers.

## Ce qu'il faut déployer

| Chemin | Contenu | Nécessaire à l'exécution |
| --- | --- | --- |
| `dist/client` | assets, HTML prérendu | oui, par le serveur ou un CDN |
| `dist/server` | le gestionnaire fetch | seulement pour le SSR |

Un site entièrement prérendu n'a besoin que de `dist/client`. Avec un build `'external'`,
`dist/server` ne suffit pas à lui seul : livrez aussi `package.json` et installez les
dépendances là où il s'exécute.

## Une API à côté d'une application web

Une [application API seule](/v1/fr/api-routes#une-application-api-seule) se construit et se lance
comme les autres : `fluixi build`, puis `fluixi start` (ou l'entrée de l'adaptateur). Elle n'a
pas de `dist/client` à servir.

Déployez les deux comme des services distincts et laissez l'application web transmettre `/api` à
l'API avec `forward({ to: process.env.API_URL })`. Le navigateur parle alors à une seule origine :
pas de CORS, et le cookie de session de l'API reste first-party. L'API fait confiance à un saut de
`x-forwarded-for`, si bien que ses limites de débit comptent le visiteur, pas le serveur web. Si le
navigateur appelle l'API directement, listez l'origine de l'application web dans
`apiSecurity({ origins })`.

## Avant de déployer

- **`prerender` exige `ssr: true`.** Le prérendu est du rendu serveur déplacé au moment du
  build ; sans SSR, il n'y a rien avec quoi rendre.
- **Le middleware ne s'exécute pas pour les pages prérendues.** Ce sont des fichiers. Une
  vérification par requête, authentification, géolocalisation, doit vivre là où quelque
  chose s'exécute réellement à chaque requête.
- **Vérifiez les versions estampillées.** L'élément de montage porte `fluixi`, `fx-dom` et
  `fx-reactive`, et `window.Fluixi` rapporte la même chose. Si elles divergent dans une
  version déployée, l'installation a résolu deux copies, mieux vaut le voir avant que cela
  ne devienne un rapport de bug.
  `@fluixi/start` résout les paquets du framework une seule fois, depuis la racine de
  l'application : une bibliothèque qui installe sa propre copie tourne quand même sur celle de
  l'application.

Ensuite : **[Injection de dépendances](/v1/fr/dependency-injection)**.
