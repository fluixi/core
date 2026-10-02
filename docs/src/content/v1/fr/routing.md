# Routage

`@fluixi/start` fournit un **routage par fichiers** : les fichiers de `src/routes/`
deviennent des routes.

```
src/routes/
  index.tsx          →  /
  about.tsx          →  /about
  users/
    layout.tsx       →  englobe tout ce qui est sous /users
    index.tsx        →  /users
    [id].tsx         →  /users/:id
  blog/
    [...slug].tsx    →  /blog/* (attrape-tout)
  (auth)/
    login.tsx        →  /login   (le groupe n'apparaît pas dans l'URL)
```

Quatre conventions, et c'est toute la couche fichier :

| Fichier | Signification |
| --- | --- |
| `index.tsx` | le chemin du dossier lui-même |
| `[id].tsx` | un segment dynamique, exposé comme `:id` |
| `[...slug].tsx` | attrape-tout, correspond au reste du chemin |
| `layout.tsx` | englobe les routes voisines et situées en dessous |
| `(nom)/` | **regroupement seul**, organise les fichiers sans ajouter de segment d'URL |

Un groupe `(auth)` est aplati : `(auth)/login.tsx` sert `/login`, pas `/auth/login`. Il
existe pour qu'un ensemble de routes partage un dossier, et, si vous en ajoutez un, un
`layout.tsx`, sans que ce dossier apparaisse dans l'URL.

## Segments dynamiques et paramètres

`[param]` capture un segment. `useParams` renvoie un **accesseur**, car naviguer entre deux
correspondances de la même route change les paramètres sans démonter le composant :

```tsx
import { useParams } from '@fluixi/start/router';

export default function Post() {
  const params = useParams<{ slug: string }>();
  return <h1>{params().slug}</h1>;
}
```

Des hooks apparentés, pour des besoins plus étroits :

```tsx
const id = useParam('id');                    // un paramètre, en accesseur
const own = useLevelParams();                 // seulement ceux introduits à ce niveau
const matched = useMatch(() => '/users/:id'); // ce motif correspond-il actuellement ?
```

## Layouts imbriqués

Un `layout.tsx` englobe ses routes enfants autour d'un `<Outlet/>` :

```tsx
import { Outlet } from '@fluixi/start/router';

export default function UsersLayout() {
  return (
    <div class="users">
      <Sidebar />
      <Outlet />
    </div>
  );
}
```

Un layout reste monté pendant la navigation entre les routes qu'il contient : l'état qu'il
détient, une position de défilement, un panneau ouvert, une liste chargée, survit à la
transition. C'est la raison principale d'en utiliser un.

## Navigation

`<Link>` navigue côté client ; un `<a href>` simple recharge la page entière.

```tsx
import { Link } from '@fluixi/start/router';

<Link href="/about">À propos</Link>
<Link href="/users/42" replace>Remplacer l'entrée d'historique</Link>
<Link href="/docs" activeClass="on">Docs</Link>
```

`activeClass` s'applique tant que le lien correspond au chemin courant : une mise en
évidence de navigation ne demande aucun câblage supplémentaire. `active` prend le pas sur
cette décision quand il vous faut autre chose qu'une correspondance exacte. `A` est un
alias de `Link`.

Pour naviguer par programme :

```tsx
import { useNavigate } from '@fluixi/start/router';

const navigate = useNavigate();
navigate('/dashboard');
navigate('/login', { replace: true });
```

### Les liens que vous n'avez pas écrits

`<Link>` couvre les liens que vous écrivez en JSX. Il ne peut rien pour ceux qui arrivent
sous forme de balisage, du markdown rendu, une réponse de CMS, tout ce qui est inséré via
`innerHTML`. Ce sont de simples ancres, sans rien à quoi se rattacher : chacune recharge
la page entière. `useLinkNavigation` renvoie un seul gestionnaire délégué, posé sur le
conteneur qui les contient :

```tsx
import { useLinkNavigation } from '@fluixi/start/router';

const onClick = useLinkNavigation();

<article onClick={onClick} innerHTML={doc.html} />
```

Les ancres restent des ancres. Clic du milieu, ouverture dans un nouvel onglet, « copier
l'adresse du lien » et les robots d'indexation continuent de fonctionner : les éléments ne
sont pas modifiés et seul un clic gauche simple est intercepté. Les `href` relatifs sont
résolus par rapport au document courant, donc un `./guide` écrit en markdown arrive au bon
endroit.

Ce qui est laissé au navigateur, délibérément :

| | |
|---|---|
| Clics avec modificateur, tout bouton autre que le principal | C'est ainsi qu'on demande un nouvel onglet |
| Un événement déjà annulé par un autre gestionnaire | Quelque chose en amont a tranché |
| `target`, `download`, `rel="external"` | Le balisage a déjà dit ce qu'il voulait |
| `mailto:`, `tel:`, tout schéma non http | Relève du système |
| Une autre origine | Ce n'est pas à nous de router |
| Une ancre interne à la page courante | C'est le défilement du navigateur, l'intercepter casse les ancres internes |

`shouldNavigate` exclut une section qui doit se charger comme un document, un autre
bundle, une zone d'administration rendue côté serveur :

```tsx
const onClick = useLinkNavigation({
  shouldNavigate: (url) => !url.pathname.startsWith('/admin'),
});
```

Il accepte aussi `replace`, comme `<Link>`.

### Emplacement et chaîne de requête

`useLocation()` renvoie un objet vivant : lisez les propriétés directement, sans appel :

```tsx
const location = useLocation();
location.pathname;   // réactif
```

`useSearchParams` est une paire lecture/écriture. Mettre une clé à `null` la supprime :

```tsx
const [params, setParams] = useSearchParams();

params().page;                        // « 2 »
setParams({ page: '3' });             // ?page=3
setParams({ page: null });            // la supprime
setParams({ page: '1' }, { replace: true });
```

## Charger des données

Un fichier de route peut exporter `routeData`, et le plus proche est disponible via
`useRouteData` :

```tsx
export function routeData({ params }) {
  return getUser(params().id);   // params est un accesseur, pas un objet simple
}

export default function User() {
  const user = useRouteData<User>();
  return <h1>{user()?.name}</h1>;
}
```

Le routeur garde la page actuelle à l'écran jusqu'à l'arrivée des données de la route suivante,
puis bascule : ni page vide ni flash de chargement entre deux routes. Les données d'un layout se
chargent une fois et restent pendant que vous passez d'un enfant à l'autre.

### Progression

`useIsRouting` vaut true du début d'une navigation jusqu'à ce que la route d'arrivée ait ses
modules et ses données. `delay` retient le `true`, pour qu'une navigation rapide n'affiche rien :

```tsx
const routing = useIsRouting({ delay: 120 });

<div class="progress" data-active={() => (routing() ? '' : undefined)} />
```

Placez une seule barre de progression dans le layout racine ; chaque navigation et chaque
chargement de données s'y rapportent.

### Échecs

Une route dont les données échouent lève l'erreur là où la page les lit : le `ErrorBoundary` le
plus proche affiche l'échec au lieu d'une page vide.

```tsx
<ErrorBoundary fallback={(error, reset) => <Failed error={error} onRetry={reset} />}>
  <Outlet />
</ErrorBoundary>
```

La limite attrape aussi les erreurs levées plus tard, par un effet bien après la construction de
la page. `reset` rend de nouveau les enfants.

### Cache et dépendances

`cache` garde les résultats d'une fonction par nom et arguments, partage une seule requête entre
les lecteurs, et `revalidate('user')` les retire et recharge les routes à l'écran. Une route peut
aussi déclarer avec `routeDeps` les valeurs de toute l'application dont ses données dépendent. Les
deux sont décrits dans [Mise en cache des données](/v1/fr/caching).

Pour des données qui ne sont pas liées à une route, `createAsync` transforme un fetcher en
ressource :

```tsx
import { createAsync, cache } from '@fluixi/start/router';

const getUser = cache((id: string) => fetchUser(id), 'user');

const user = createAsync(() => getUser(props.id));
```

## Mutations

`action` enveloppe une mutation pour que sa progression soit observable :

```tsx
import { action, useSubmission, Form } from '@fluixi/start/router';

const save = action(async (data: FormData) => {
  await updateProfile(data);
}, 'save-profile', { invalidates: ['profile'] });

function Profile() {
  const submission = useSubmission(save);

  return (
    <Form action={save}>
      <input name="name" />
      <button disabled={!!submission()?.pending}>Save</button>
    </Form>
  );
}
```

Utilisez `<Form>`, pas un `<form action={save}>` simple : l'action est une fonction, et un
attribut `action` doit être une URL. `<Form>` construit le `FormData`, appelle l'action sans
navigation, et émet quand même `method="post"` avec la vraie URL de l'action dans le balisage,
si bien qu'une soumission fonctionne avant le chargement du JavaScript.

Nommez chaque action : le nom sert à suivre ses soumissions, et deux actions sans nom les
partageraient. `invalidates` liste les données en cache qu'un succès change, pour que les pages
qui les affichent se rechargent.

`useSubmission` rapporte le dernier appel, en cours, résultat, erreur, avec `retry` et `clear` :
ce qu'il faut à un formulaire pour désactiver son bouton et afficher un échec sans le suivre à la
main.

### Mises à jour optimistes

`useSubmissions` liste chaque appel encore en cours, et ceux qui ont échoué, une entrée par appel :
des appels simultanés ne s'écrasent pas. Affichez les lignes du serveur, puis les appels en cours
sous la même forme :

```tsx
const moves = useSubmissions(moveDeal);

const rows = $memo(() => [
  ...deals(),
  ...moves().filter((s) => s.pending).map((s) => ({ ...s.input, pending: true })),
]);
```

Un appel réussi quitte la liste et la ligne du serveur prend sa place. Un appel qui échoue cesse
d'être en cours, il quitte donc de lui-même les lignes optimistes, et reste dans la liste avec son
`error` jusqu'à `retry()` ou `clear()`.

Ensuite : **[Fonctions serveur](/v1/fr/server-functions)**.
