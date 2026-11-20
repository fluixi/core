# Venir de React, Solid ou Next.js

Ce qui reste, ce qui change, et les habitudes à abandonner. Chaque section relie ce que vous
connaissez à son équivalent Fluixi et à la page qui l'explique.

## Depuis React

Le plus grand changement : **un composant s'exécute une fois.** Il n'y a pas de nouveau rendu.
L'état vit dans des signaux, et un changement ne met à jour que le texte, l'attribut ou la branche
qui le lit. La plupart des habitudes React viennent du nouveau rendu, et la plupart peuvent
disparaître.

| React | Fluixi |
|---|---|
| `const [n, setN] = useState(0)` | `const n = $signal(0)`, lecture `n()`, écriture `n.set(1)` |
| `useMemo(() => a * b, [a, b])` | `$memo(() => a() * b())` : pas de tableau de dépendances, les lectures sont suivies |
| `useEffect(() => {...}, [dep])` | `$effect(() => {...})` ; `onMount` pour du code exécuté une fois dans le navigateur |
| nettoyage d'effet `return () => ...` | `onCleanup(() => ...)`, ou la fonction que renvoie `onMount` |
| `useRef` | `let el!: HTMLElement` et `ref={el}` ; une simple variable pour le reste |
| `useCallback` | une simple fonction : le composant ne se réexécute pas, rien n'est recréé |
| `React.memo` | rien : il n'y a pas de nouveau rendu à éviter |
| `{cond && <X />}` | `<Show when={cond()}><X /></Show>` |
| `list.map(x => <li key={x.id}>)` | `<For each={list()} by={(x) => x.id}>` |
| `useContext` / `createContext` | les mêmes noms, depuis `@fluixi/core` ([Le contexte](/v1/fr/context)) |
| `useReducer`, état imbriqué | `$store` avec des écritures par chemin ([Les stores](/v1/fr/stores)) |
| `<Suspense>`, `lazy` | les mêmes, plus `load:visible` et les autres sur n'importe quelle balise ([Stratégies de chargement](/v1/fr/load-strategies)) |
| `className` | `class`, et `classList={{ active: on() }}` |
| `useId` | `createUniqueId()` |

Les habitudes à abandonner :

- **Les tableaux de dépendances.** Un memo ou un effet suit ce qu'il lit, à chaque exécution. Rien
  à garder synchronisé, pas de fermeture périmée.
- **Déstructurer les props en haut en comptant qu'elles restent à jour.** Le compilateur les garde
  vivantes dans les cas simples ; une déstructuration imbriquée lit une fois et le build le signale
  ([Composants](/v1/fr/components)).
- **Les `return` anticipés.** `if (!user) return <Login />` est décidé une fois ; utilisez `<Show>`.
- **Écrire un état dans un effet pour le dériver.** Utilisez un memo.
- **S'inquiéter du coût du rendu.** Découper un composant ne change pas ce qui se met à jour.

## Depuis Solid

Fluixi est proche de Solid : signaux fins, composants exécutés une fois, mêmes composants de flux de
contrôle. Ce qui diffère :

| Solid | Fluixi |
|---|---|
| `const [n, setN] = createSignal(0)` | `const n = signal(0)` (ou `$signal` dans une application) : une seule poignée, `n()` et `n.set()`. `createSignal` existe toujours et renvoie le tuple |
| `createMemo`, `createEffect`, `createResource` | `memo`, `effect`, `resource`, et leurs formes `$` sans import |
| `createStore` renvoie `[state, setState]` | `$store(...)` renvoie une seule poignée : lecture `cart.lines`, écriture `cart.set('lines', ...)` |
| `<For each={list()}>` | le même ; ajoutez `by={(x) => x.id}` pour garder les lignes d'objets recréés |
| `mergeProps`, `splitProps`, `children()` | `mergeProps`, `splitProps`, `readChildren()` |
| `splitProps` pour garder les props vivantes en déstructurant | écrivez `function C({ title })` : le compilateur le réécrit en `props.title` |
| `createEffect` ignoré sur le serveur | **un effet s'exécute aussi sur le serveur** ; utilisez `onMount` pour ce qui est propre au navigateur ([Les effets](/v1/fr/effects)) |

Nouveau aussi : l'injection de dépendances avec `inject()` et les modules d'application
([Injection de dépendances](/v1/fr/dependency-injection)), les éléments personnalisés comme
composants à part entière ([Web components](/v1/fr/web-components)), et les stratégies `load:` sur
n'importe quelle balise.

## Depuis Next.js

`@fluixi/start` couvre ce que Next.js fait pour une application (routes par fichiers, rendu serveur,
code serveur, middleware, sortie statique), avec un autre modèle pour les données : il n'y a pas de
composants serveur. Chaque composant de route est rendu sur le serveur et hydraté dans le
navigateur ; les données arrivent par `routeData`.

| Next.js | Fluixi start |
|---|---|
| `app/blog/[slug]/page.tsx` | `src/routes/blog/[slug].tsx` ([Le routage](/v1/fr/routing)) |
| `layout.tsx` | une route de layout qui affiche `<Outlet />` |
| composant serveur `async` qui charge des données | `export const routeData = ...` dans le fichier de route, lu avec `useRouteData()` |
| `fetch(..., { next: { revalidate } })` | `cache(fn, 'name')` et `revalidate('name')` ([Mise en cache](/v1/fr/caching)) |
| Server Actions | fonctions `'use server'` et `action(fn, 'name')` ([Fonctions serveur](/v1/fr/server-functions)) |
| `app/api/.../route.ts` | routes d'API ([Routes d'API](/v1/fr/api-routes)) |
| `middleware.ts` | middleware ([Middleware](/v1/fr/middleware)) |
| `metadata` / `generateMetadata` | `seo()` ([SEO](/v1/fr/seo)) |
| `next/link`, `useRouter().push` | `<Link href>`, `useNavigate()` |
| `useParams`, `useSearchParams` | les mêmes noms, depuis `@fluixi/start/router` |
| `generateStaticParams`, export statique | [Génération statique](/v1/fr/static-generation) |
| `NEXT_PUBLIC_*` | les noms listés dans `env.public` ([Environnement](/v1/fr/environment)) |
| `'use client'` | inutile : chaque composant s'exécute dans le navigateur ; marquez les fichiers serveur `*.server.ts` |
| `next/image` | [Images](/v1/fr/images) |

Pour garder du code hors du client, il n'y a pas de frontière `'use client'` à gérer. Le code
serveur va dans les fichiers `*.server.ts`, les fonctions `'use server'`, les routes d'API et les
middleware, et le build refuse l'import d'un fichier serveur depuis du code navigateur. Pour livrer
moins de JavaScript pour une partie de la page, différez-la avec `load:visible`, `load:idle` ou
`load:never`.

Suivant : **[Dépannage](/v1/fr/troubleshooting)**.
