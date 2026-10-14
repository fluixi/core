# Injection de dépendances

`@fluixi/di` partage services, clients et configuration sans les faire descendre par les props.
Il fonctionne comme l'injecteur d'Angular, avec deux différences qui comptent dans une
application rendue côté serveur : l'injecteur racine est **un par requête sur le serveur**, si
bien que l'état d'un utilisateur ne fuit jamais dans le rendu d'un autre, et la hiérarchie des
composants est **l'arbre de propriété réactif**, si bien que les services d'un composant sont
libérés quand il est démonté.

```ts
import { injectionToken, provideRoot, inject } from '@fluixi/di';

const Api = injectionToken<ApiClient>('Api');

provideRoot([{ provide: Api, useFactory: () => new ApiClient(env.API_URL) }]);

function Tickets() {
  const api = inject(Api);
  // ...
}
```

## Quel import

- **Les packages** (une bibliothèque de composants, un SDK, des éléments partagés) importent
  `@fluixi/di` et le déclarent en dépendance pair (`peerDependencies`). Ils dépendent alors de
  l'injecteur seul, pas du méta-framework.
- **Les applications** construites avec `@fluixi/start` peuvent importer `@fluixi/start/di`, qui
  réexporte `@fluixi/di` tel quel. Les bundlers ne gardent que ce qui sert.

Les deux mènent aux mêmes injecteurs : un service fourni par l'application est trouvé par le
`inject()` d'un package.

## Jetons

Un jeton est une identité, pas une valeur : deux jetons du même nom restent distincts, et le
paramètre de type est ce qui fait renvoyer à `inject` le bon type.

```ts
const Config = injectionToken<AppConfig>('Config');
```

Un jeton avec une `factory` se fournit lui-même là où il est demandé la première fois : `inject`
fonctionne sans rien fournir. Un fournisseur sur le chemin passe quand même avant, et c'est ainsi
qu'un test le remplace.

```ts
const Now = injectionToken('Now', { factory: () => () => new Date() });
const Pool = injectionToken('Pool', { factory: () => createPool(), scope: 'platform' });
```

La factory construit une fois par racine par défaut (par requête sur le serveur, par
application dans le navigateur), ou une fois par processus avec `scope: 'platform'`. Un service
que personne n'injecte n'est jamais construit.

## Formes de fournisseur

```ts
provideRoot([
  { provide: Config, useValue: { apiUrl: '/api' } },                // une valeur prête
  { provide: Clock, useClass: SystemClock },                        // construite une fois
  { provide: Api, useFactory: (c) => new Api(c.apiUrl), deps: [Config] },
  { provide: LegacyApi, useExisting: Api },                         // un alias
]);
```

`deps` liste ce qu'il faut résoudre et passer, dans l'ordre, à la factory ou au constructeur.
Une dépendance peut porter des options : `deps: [Store, { token: Logger, optional: true }]`.

Une classe ou une factory peut aussi appeler `inject()` elle-même. La résolution part de
l'injecteur qui **détient le fournisseur**, pas de l'endroit où le service a été demandé la
première fois :

```ts
class CheckoutService {
  #payments = inject(Payments);
  #log = inject(Logger, { optional: true });
}
```

Tout est construit à la première demande, puis réutilisé par cet injecteur.

### Fournisseurs multiples

`multi: true` ajoute une valeur à une liste au lieu de remplacer la valeur du jeton. Les
intercepteurs, les extensions et les validateurs en sont le cas habituel :

```ts
const Interceptors = injectionToken<Interceptor[]>('Interceptors');

provideRoot([
  { provide: Interceptors, useValue: authInterceptor, multi: true },
  { provide: Interceptors, useValue: retryInterceptor, multi: true },
]);

inject(Interceptors); // [authInterceptor, retryInterceptor], dans l'ordre d'enregistrement
```

Un composant qui fournit ses propres valeurs `multi` pour le jeton a sa propre liste ; elle ne
prolonge pas celle du dessus.

## La hiérarchie

| Injecteur | Créé par | Vit |
|---|---|---|
| plateforme | `providePlatform()`, jetons `scope: 'platform'` | tout le processus |
| racine | `provideRoot()`, modules d'application, jetons `scope: 'root'` | une requête sur le serveur, la page dans le navigateur |
| composant | `provide()` dans un composant | jusqu'au démontage du composant |
| autonome | `createInjector()` | jusqu'à votre appel à `dispose()` |

`inject()` résout depuis le contexte courant : un injecteur explicite (plus bas), sinon
l'injecteur de composant le plus proche en remontant l'arbre de propriété, sinon la racine,
puis la plateforme, puis la factory du jeton.

```ts
function Editor() {
  provide([{ provide: Draft, useClass: DraftStore }]);   // le brouillon de cet éditeur seul
  return <EditorBody />;                                 // inject(Draft) à l'intérieur le trouve
}
```

### Choisir une portée

- **`provideRoot`** : une instance pour l'application. Une session, un journal, un client
  d'API. Créée par requête sur le serveur, une fois par page dans le navigateur.
- **`provide` dans un composant** : la valeur appartient à ce qui est à l'écran. Une réponse en
  cours de rédaction, l'état partiel d'un assistant, le tampon d'un éditeur. Libérée avec le
  composant.
- **`providePlatform`** : coûteux à créer et sans risque à partager entre utilisateurs. Un pool
  de connexions, des réglages analysés. Jamais d'état propre à un utilisateur.
- **Un simple export de module** : ni durée de vie ni identité par requête. Fonctions pures,
  constantes.

Pour choisir entre racine et composant, demandez-vous ce qui doit arriver quand l'utilisateur
quitte la page : gardé, c'est la racine ; jeté, c'est le composant.
`examples/ticket-desk/src/routes/tickets/[id].tsx` fournit un `DraftStore` sur le composant, pour
qu'une réponse à moitié écrite ne vous suive pas au ticket suivant.

## Options de résolution

`inject(token, options)` et les entrées de `deps` acceptent :

| Option | Effet |
|---|---|
| `optional` | `null` au lieu d'une erreur quand rien ne fournit le jeton |
| `self` | chercher seulement dans l'injecteur courant |
| `skipSelf` | commencer par le parent : lire ce que fournit un ancêtre tout en fournissant le même jeton plus bas |
| `host` | s'arrêter à l'injecteur de composant le plus proche |

```ts
const parentForm = inject(FormGroup, { skipSelf: true, optional: true });
```

## Cycle de vie

Quand un injecteur est libéré (un composant démonté, une requête serveur terminée, `dispose()`
sur un injecteur que vous avez créé), il libère ce qu'il a construit :

1. les fonctions enregistrées sur son `DestroyRef`, la dernière d'abord ;
2. la méthode `onDestroy()` de chaque service construit, le dernier construit d'abord.

```ts
import { DestroyRef, inject } from '@fluixi/di';

class Poller {
  #timer = setInterval(() => this.poll(), 5_000);
  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.#timer));
  }
}
```

`onDestroy` renvoie une fonction qui désenregistre la fonction. Une fonction qui lève une erreur
est journalisée et les autres s'exécutent quand même.

## Initialisation de l'application

Ce qui doit être terminé avant le rendu va dans un initialiseur. Ils s'exécutent dans l'ordre
d'enregistrement, chacun attendu ; le premier qui échoue arrête les suivants.

```ts
import { provideAppInitializer, provideRoot, inject } from '@fluixi/di';

provideRoot([
  provideAppInitializer(async () => {
    await inject(Settings).load();
  }),
]);
```

## Racines par requête

Sur le serveur, l'injecteur racine est créé par requête, si bien que deux requêtes simultanées
ne partagent jamais d'instance, et il est libéré à la fin de la requête : les services rendent
alors leurs connexions et leurs minuteries. Dans le navigateur, il y a une seule racine pour la
vie de la page.

C'est la raison de préférer la DI à un singleton de module dans une application rendue côté
serveur : une variable de module est partagée par toutes les requêtes du processus, et la
session d'un utilisateur qui fuit dans le rendu d'un autre est un bogue qui n'apparaît qu'en
charge.

## Où `inject()` ne fonctionne pas

`inject()` lit le contexte d'injection courant, qui n'existe pas à trois endroits :

1. **Au niveau du module.** Un appel en haut d'un fichier s'exécute avant tout composant et
   toute requête. On y fournit ; on injecte dans les composants et les services.
2. **Après un `await`.** Le contexte est synchrone. Résolvez tout avant le premier `await` : une
   route d'API qui attendait `request.json()` avant d'injecter son dépôt ne trouvait aucun
   contexte.
3. **Dans un rappel qui survit à son propriétaire.** Un intercepteur, un `setTimeout`, un
   écouteur ajouté hors d'un composant. Gardez l'injecteur tant que le contexte existe et
   exécutez le rappel dedans :

```ts
const injector = inject(INJECTOR);
socket.on('message', () => runInInjectionContext(injector, () => inject(Inbox).add()));
```

`isInInjectionContext()` indique si un contexte est actif, et
`assertInInjectionContext('useCart')` donne une erreur claire à vos propres fonctions.

## Erreurs

Un fournisseur manquant ou un cycle lève une `InjectionError` qui nomme tout le chemin de
résolution, pour distinguer la pièce manquante de ce qui en avait besoin :

```
No provider for "ApiKey" (Checkout → Payments → ApiKey).
Circular dependency: A → B → A.
```

`error.path` contient la même chaîne sous forme de tableau.

## Fonctions serveur et DI

Une fonction `"use server"` s'exécute dans la requête, et `inject()` y résout depuis l'injecteur
racine de cette requête. Deux utilisateurs qui appellent la même fonction au même instant
obtiennent deux instances différentes d'un service racine. `examples/ticket-desk/src/actions.ts`
injecte `TicketRepoToken` dans une fonction serveur ; `tests/di.spec.ts` vérifie que deux
requêtes simultanées ne voient jamais les tickets de l'autre. Injectez avant le premier `await`.

## La DI ne détermine pas l'identité lors du rendu serveur

Le middleware écrit l'utilisateur dans les locals de la requête (`getRequestLocals(request)`), et
le rendu les lit avec `getLocals()` ; les hooks de `@fluixi/auth` y lisent déjà. La DI décide
quelle instance d'un service utiliser ; les locals portent ce que le middleware a appris de la
requête.

## Tests

`@fluixi/di/testing` construit des injecteurs pour les tests, séparé du point d'entrée
principal pour qu'aucune application ne l'embarque.

```ts
import { createTestInjector, resetInjection } from '@fluixi/di/testing';

afterEach(() => resetInjection());

it('débite le total du panier', async () => {
  const payments = { charge: vi.fn() };
  const injector = createTestInjector({
    providers: [{ provide: Checkout, useClass: CheckoutService }],
    overrides: [{ provide: Payments, useValue: payments }],
  });
  await injector.get(Checkout).pay();
  expect(payments.charge).toHaveBeenCalled();
});
```

`createTestInjector` construit une racine à lui, sans les fournisseurs de l'application.
`overrides` remplace un jeton partout où il serait fourni, sa propre factory comprise, jusqu'à
`resetInjection()`, qui libère aussi ce qui a été construit.

Ensuite : **[Internationalisation](/v1/fr/i18n)**.
