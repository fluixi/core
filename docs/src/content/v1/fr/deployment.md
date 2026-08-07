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

## Écrire un adaptateur

Un adaptateur, c'est deux champs :

```ts
import type { Adapter } from '@fluixi/start';

export const myAdapter: Adapter = {
  name: 'ma-plateforme',
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

> Les adaptateurs couvrent pour l'instant le **service**. L'émission d'artefacts au moment
> du build — bundle worker, manifeste de fonctions, fichier de configuration de plateforme —
> n'est pas encore implémentée : viser une plateforme exigeant une disposition de sortie
> précise demande donc encore de l'organiser vous-même.

## Ce qu'il faut déployer

| Chemin | Contenu | Nécessaire à l'exécution |
| --- | --- | --- |
| `dist/client` | assets, HTML prérendu | oui — par le serveur ou un CDN |
| `dist/server` | le gestionnaire fetch | seulement pour le SSR |

Un site entièrement prérendu n'a besoin que de `dist/client`.

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
