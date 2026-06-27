# La génération statique

Activez `prerender` dans `fluixi.config` et `fluixi build` rend vos routes en **HTML statique** dans
`dist/client` — déployez sur n'importe quel hébergeur statique ; les pages s'hydratent côté client.

```ts
// fluixi.config.ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  prerender: true, // explore depuis « / » en suivant les liens <a> internes
});
```

Ce site de documentation est construit ainsi.

## Routes explicites

Pour les routes dynamiques sans lien entrant, listez-les — et activez/désactivez l'exploration :

```ts
export default defineConfig({
  prerender: { routes: ['/', '/blog/hello'], crawl: true },
});
```

Chaque page est rendue via le **vrai gestionnaire de production** : la sortie statique est identique
à ce que servirait `fluixi start` — ressources, données sérialisées, marqueurs d'hydratation
compris.

Suivant : **[L'injection de dépendances](/v1/fr/dependency-injection)**.
