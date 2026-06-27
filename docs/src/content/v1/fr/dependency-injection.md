# L'injection de dépendances

`@fluixi/start/di` fournit un injecteur à la Angular — pratique pour partager services, clients et
configuration sans « prop-drilling », avec une **isolation par requête** sur le serveur.

```ts
import { injectionToken, provide, inject } from '@fluixi/start/di';

const ApiClient = injectionToken<ApiClient>('ApiClient');

// fournissez-le (par ex. à la racine de l'app) :
provide(ApiClient, { useFactory: () => new ApiClient(env.API_URL) });

// injectez-le partout dans l'arbre de propriété :
const api = inject(ApiClient);
```

## Racines par requête

Sur le serveur, l'injecteur racine est créé **par requête** : deux requêtes concurrentes ne
partagent jamais d'instances — un service à portée de requête (connexion BDD, session utilisateur)
reste isolé. Côté client, c'est un singleton.

Les fournisseurs gèrent `useValue`, `useClass`, `useFactory(deps)` et `useExisting`, avec détection
des dépendances circulaires et un cycle de vie `onDestroy`.

Suivant : **[L'internationalisation](/v1/fr/i18n)**.
