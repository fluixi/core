# Injection de dépendances

`@fluixi/start/di` fournit un injecteur à la Angular, pratique pour partager services,
clients et configuration sans faire descendre des props, avec une **isolation par requête**
sur le serveur.

```ts
import { injectionToken, provide, inject } from '@fluixi/start/di';

const ApiClientToken = injectionToken<ApiClient>('ApiClient');

// Le fournir, par exemple à la racine de l'application :
provide([
  { provide: ApiClientToken, useFactory: () => new ApiClient(env.API_URL) },
]);

// L'injecter n'importe où dans l'arbre de propriété :
const api = inject(ApiClientToken);
```

`provide` prend un **tableau** de fournisseurs : un seul appel en enregistre donc tout un
ensemble, et renvoie l'injecteur créé.

## Jetons

Un jeton est une identité, pas une valeur, deux jetons de même nom restent distincts, et
c'est le paramètre de type qui fait renvoyer le bon type à `inject`.

```ts
const Config = injectionToken<AppConfig>('Config');
const Now = injectionToken<() => Date>('Now', { factory: () => () => new Date() });
```

Un jeton doté d'une `factory` a une valeur par défaut : `inject(Now)` fonctionne sans que
rien n'ait été fourni, utile pour ce qui a presque toujours une implémentation évidente et
qu'on remplace parfois dans un test.

## Formes de fournisseur

```ts
provide([
  { provide: Config, useValue: { apiUrl: '/api' } },              // une valeur prête
  { provide: Clock, useClass: SystemClock },                      // construit une fois
  { provide: Api, useFactory: (c) => new Api(c.apiUrl), deps: [Config] },
  { provide: LegacyApi, useExisting: Api },                       // un alias
]);
```

`deps` liste les jetons à résoudre et à passer, dans l'ordre, à `useFactory` ou au
constructeur de `useClass`. Tout est construit **paresseusement** au premier `inject` puis
mis en cache : un service que personne n'injecte n'est jamais construit.

Une dépendance circulaire est détectée et signalée, plutôt que de faire déborder la pile.

## Portée

Les injecteurs suivent l'arbre de propriété réactif : un `provide` dans un composant masque
donc celui du dessus pour ce sous-arbre, et disparaît avec lui.

```ts
createRoot(() => {
  provide([{ provide: T, useValue: 'enfant' }]);
  inject(T);   // « enfant »
});
inject(T);     // de retour à la valeur externe
```

`provideRoot` enregistre sur l'injecteur racine, ce que veut généralement un service
applicatif. `runInInjectionContext(injector, fn)` exécute `fn` avec un injecteur précis,
nécessaire quand il faut injecter depuis un callback sorti de l'arbre de propriété.

## Racines par requête

Sur le serveur, l'injecteur racine est créé **par requête** : deux requêtes traitées
simultanément ne partagent donc jamais d'instances. Un service à portée de requête, une
connexion à la base, la session de l'utilisateur courant, reste isolé sans effort de votre
part. Côté client, il y a une seule racine pour la durée de vie de la page.

C'est la raison de préférer l'injection à un singleton de module dans une application SSR :
une variable globale de module est partagée par toutes les requêtes du processus, et faire
fuiter la session d'un utilisateur dans le rendu d'un autre est le genre de bug qui
n'apparaît qu'en concurrence.

## Nettoyage

Un fournisseur peut implémenter `onDestroy`, appelé quand son injecteur est libéré, en fin
de requête sur le serveur, ou à la libération de la racine propriétaire côté client.

Ensuite : **[Internationalisation](/v1/fr/i18n)**.
