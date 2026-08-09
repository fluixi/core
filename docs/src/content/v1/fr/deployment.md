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
dans `dist/client` en HTML. Envoyez ce dossier n'importe où — il n'y a aucun serveur à faire
tourner.

**Un serveur Node.** `fluixi start` lance l'adaptateur node : il écoute sur un port et sert
`dist/client` depuis le disque, en repassant au gestionnaire pour ce qui n'est pas trouvé.
C'est le comportement par défaut, sans configuration.

**Un runtime edge ou serverless.** Ces plateformes ne veulent pas d'un processus qui écoute,
mais d'un module exportant `fetch`. C'est ce que renvoie l'adaptateur web :

```ts
import { createProdHandler, webAdapter } from '@fluixi/start';

const handler = await createProdHandler(/* … */);

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

`fluixi start` sert lui aussi avec cet adaptateur — avec `webAdapter`, il n'a rien à lancer,
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
**4,6 Ko au lieu de 76 Ko** — le code de l'application et rien d'autre — et un build complet
qui passe de 1,9 s à 0,8 s. Le HTML rendu est identique octet pour octet dans les deux cas.

Un runtime edge ou serverless est le cas inverse : vous envoyez un fichier, pas une
installation — rien ne doit rester à résoudre, et `'inline'` met tout dans le bundle.

`'external'` externalise les paquets `@fluixi/*` **que votre application déclare en
dépendances**, et rien d'autre. Avec une disposition stricte de `node_modules` (pnpm), un
paquet que vous n'avez jamais déclaré n'est pas résolvable depuis la racine de
l'application : l'externaliser produirait un bundle important quelque chose que Node ne
trouve pas. Chaque paquet est listé avec tous les sous-chemins qu'il exporte, car
l'externaliser à moitié — `@fluixi/core` en import, `@fluixi/core/router-next` copié dans le
bundle — mettrait deux routeurs, et deux états de module, dans le même serveur.
`ssrNoExternal` reste prioritaire sur tout cela — c'est l'application qui dit « celui-ci,
bundle-le quand même ».

> Seul le build lit `bundle`. Le dev n'externalise jamais : `fluixi dev` charge les modules
> serveur via Vite pour que leur édition déclenche toujours le HMR.

## Écrire un adaptateur

Un adaptateur, c'est un nom, une fonction `serve`, et éventuellement le mode de bundling
qu'exige sa plateforme :

```ts
import type { Adapter } from '@fluixi/start';

export const myAdapter: Adapter = {
  name: 'ma-plateforme',
  bundle: 'inline',
  serve({ handler, cfg, clientDir }) {
    // Soit prendre le contrôle du processus — écouter, bloquer, ne jamais rendre la main —
    // soit renvoyer { fetch } pour que la plateforme l'invoque.
    return { fetch: handler };
  },
};
```

`serve` reçoit le gestionnaire, la configuration résolue et le dossier client compilé. Un
runtime avec système de fichiers utilise `clientDir` pour servir les assets ; un runtime
edge l'ignore, la plateforme s'en chargeant déjà.

> Les adaptateurs couvrent le **service** et la façon dont le serveur est bundlé. L'émission
> d'artefacts de plateforme — point d'entrée worker, manifeste de fonctions, fichier de
> configuration — n'est pas encore implémentée : viser une plateforme exigeant une
> disposition de sortie précise demande donc encore de l'organiser vous-même.

## Ce qu'il faut déployer

| Chemin | Contenu | Nécessaire à l'exécution |
| --- | --- | --- |
| `dist/client` | assets, HTML prérendu | oui — par le serveur ou un CDN |
| `dist/server` | le gestionnaire fetch | seulement pour le SSR |

Un site entièrement prérendu n'a besoin que de `dist/client`. Avec un build `'external'`,
`dist/server` ne suffit pas à lui seul : livrez aussi `package.json` et installez les
dépendances là où il s'exécute.

## Avant de déployer

- **`prerender` exige `ssr: true`.** Le prérendu est du rendu serveur déplacé au moment du
  build ; sans SSR, il n'y a rien avec quoi rendre.
- **Le middleware ne s'exécute pas pour les pages prérendues.** Ce sont des fichiers. Une
  vérification par requête — authentification, géolocalisation — doit vivre là où quelque
  chose s'exécute réellement à chaque requête.
- **Vérifiez les versions estampillées.** L'élément de montage porte `fluixi`, `fx-dom` et
  `fx-reactive`, et `window.Fluixi` rapporte la même chose. Si elles divergent dans une
  version déployée, l'installation a résolu deux copies — mieux vaut le voir avant que cela
  ne devienne un rapport de bug.

Ensuite : **[Injection de dépendances](/v1/fr/dependency-injection)**.
