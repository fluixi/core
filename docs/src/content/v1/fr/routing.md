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
    login.tsx        →  /login   — le groupe n'apparaît pas dans l'URL
```

Quatre conventions, et c'est toute la couche fichier :

| Fichier | Signification |
| --- | --- |
| `index.tsx` | le chemin du dossier lui-même |
| `[id].tsx` | un segment dynamique, exposé comme `:id` |
| `[...slug].tsx` | attrape-tout — correspond au reste du chemin |
| `layout.tsx` | englobe les routes voisines et situées en dessous |
| `(nom)/` | **regroupement seul** — organise les fichiers sans ajouter de segment d'URL |

Un groupe `(auth)` est aplati : `(auth)/login.tsx` sert `/login`, pas `/auth/login`. Il
existe pour qu'un ensemble de routes partage un dossier — et, si vous en ajoutez un, un
`layout.tsx` — sans que ce dossier apparaisse dans l'URL.

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
détient — une position de défilement, un panneau ouvert, une liste chargée — survit à la
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
sous forme de balisage — du markdown rendu, une réponse de CMS, tout ce qui est inséré via
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
| Une ancre interne à la page courante | C'est le défilement du navigateur — l'intercepter casse les ancres internes |

`shouldNavigate` exclut une section qui doit se charger comme un document — un autre
bundle, une zone d'administration rendue côté serveur :

```tsx
const onClick = useLinkNavigation({
  shouldNavigate: (url) => !url.pathname.startsWith('/admin'),
});
```

Il accepte aussi `replace`, comme `<Link>`.

### Emplacement et chaîne de requête

`useLocation()` renvoie un objet vivant — lisez les propriétés directement, sans appel :

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

Un fichier de route peut exporter `routeData` ; le plus proche est accessible via
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

`useRouteData` renvoie un accesseur qui suspend sous `<Suspense>` pendant le chargement :
une frontière au-dessus affiche donc son fallback plutôt qu'un état vide clignotant.

Pour des données non liées à une route, `createAsync` transforme un fetcher en ressource :

```tsx
import { createAsync, cache } from '@fluixi/start/router';

const getUser = cache((id: string) => fetchUser(id), 'user');

const user = createAsync(() => getUser(props.id));
```

`cache` donne à la fonction une clé stable : les appels identiques sont dédupliqués, les
résultats sont transférés du serveur au client à l'hydratation au lieu d'être récupérés
deux fois, et `revalidate('user')` peut les invalider.

## Mutations

`action` enveloppe une mutation pour rendre sa progression observable :

```tsx
import { action, useSubmission, Form } from '@fluixi/start/router';

const save = action(async (data: FormData) => {
  await updateProfile(data);
}, 'save-profile');

function Profile() {
  const submission = useSubmission(save);

  return (
    <Form action={save}>
      <input name="name" />
      <button disabled={!!submission()?.pending}>Enregistrer</button>
    </Form>
  );
}
```

Utilisez `<Form>`, pas un `<form action={save}>` simple : l'action est une fonction, et un
attribut `action` doit être une URL. `<Form>` construit le `FormData`, appelle l'action sans
navigation, et émet quand même `method="post"` avec la véritable URL de l'action dans le
balisage — l'envoi fonctionne donc avant le chargement de JavaScript.

`useSubmission` rapporte l'état en cours — en attente, résultat, erreur — avec `retry` et
`clear` : exactement ce qu'il faut à un formulaire pour désactiver son bouton et signaler un
échec sans suivre cela à la main.

Ensuite : **[Fonctions serveur](/v1/fr/server-functions)**.
