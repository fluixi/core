# Sessions

`@fluixi/session` s'adresse à une application qui a sa propre page de connexion et son
propre stockage d'utilisateurs. Vous fournissez une fonction qui transforme des
identifiants en token ; le paquet possède tout ce qui vient après.

```ts
import { createSession } from '@fluixi/session';

export const auth = createSession<User, { email: string; password: string }>({
  async login(creds) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (!response.ok) throw new Error('Ces identifiants ne correspondent pas.');

    const { access_token, expires_in } = await response.json();
    return { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  },

  fetchUser: (token) =>
    fetch('/api/me', { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json()),
});
```

C'est tout le côté client. Ce que vous obtenez sans l'écrire :

- `user()`, `token()`, `status()` et `isAuthenticated()` comme signaux
- la persistance, pour qu'un rechargement ne déconnecte personne
- l'hydratation au premier chargement, depuis le stockage
- le rafraîchissement automatique avant expiration, dès que vous fournissez `refresh`
- les rôles et permissions, dès que vous fournissez `access`
- un guard qui réagit à un 401 venant de votre propre API

## L'adaptateur

Seuls `login` et `fetchUser` sont obligatoires. Le reste ajoute des comportements.

```ts
createSession<User, Credentials>({
  login: (creds) => /* -> une chaîne token, ou { token, expiresAt } */,
  fetchUser: (token) => /* -> l'utilisateur */,

  logout: () => fetch('/api/logout', { method: 'POST' }),
  register: (data) => /* -> un token pour connecter aussitôt, ou rien */,
  refresh: (token) => /* -> un token frais, active le rafraîchissement automatique */,
  getExpiry: (token) => /* -> epoch ms, quand le token ne le dit pas */,
});
```

`refresh` est ce qui arme le timer. Sans lui une session expire, simplement.
`getExpiry` ne sert que si votre token est opaque et que la réponse de connexion ne porte
pas d'`expires_in`.

## Où il est gardé

Le token, l'utilisateur et l'expiration sont gardés dans localStorage dans le navigateur, via
[`@fluixi/storage`](/v1/fr/storage), et nulle part sur le serveur : un seul objet de session y
serait partagé par tous les visiteurs. Passez `storage` pour un autre endroit, ou `null` pour
les garder en mémoire seulement.

```ts
createSession({ ...adapter, storage: createStorage({ adapter: sessionStorageAdapter() }) });
```

## Le statut, et pourquoi il a plus de deux valeurs

```ts
auth.status();  // 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
```

Deux états vous obligeraient à rendre une page déconnectée pendant que la première
hydratation est encore en cours, ce qui est le flash que toutes les applications
contournent ensuite. `loading` existe pour ne rien rendre tant que la réponse est
inconnue.

```tsx
<Show when={() => auth.status() !== 'loading'} fallback={<Spinner />}>
  <App />
</Show>
```

## Rôles et permissions

`access` associe un utilisateur à un jeu de permissions. `getRole` lit le rôle là où il se
trouve sur votre utilisateur ; `permissions` associe les rôles à la forme que vous voulez.

```ts
createSession<User, Credentials, unknown, Permissions>({
  login,
  fetchUser,
  access: {
    getRole: (user) => user?.role ?? null,
    permissions: {
      admin:   { users: { read: true, delete: true } },
      support: { users: { read: true, delete: false } },
    },
    guest: { users: { read: false, delete: false } },
  },
});
```

```ts
auth.roles();                          // ['admin']
auth.can((p) => p.users.delete);       // true
```

`permissions` accepte aussi une fonction à la place d'une table, pour des accès calculés
depuis les champs de l'utilisateur plutôt qu'une matrice fixe.

C'est une aide au rendu. C'est votre serveur qui décide de ce qui est autorisé.

## Le cookie de session, côté serveur

`@fluixi/session/server` tient une session que le navigateur ne peut pas lire. Il scelle
une valeur dans un cookie httpOnly avec AES-GCM via Web Crypto, donc il tourne sur Node,
Bun, Deno et un worker sans dépendance native.

```ts
import { createSessionCookie } from '@fluixi/session/server';

const session = createSessionCookie<{ userId: string }>({
  secret: process.env.SESSION_SECRET!,   // au moins 32 caractères
});

// après que votre code a vérifié le mot de passe
return new Response(null, {
  status: 302,
  headers: { location: '/', 'set-cookie': await session.write({ userId: user.id }) },
});

// sur toute requête ultérieure
const current = await session.read(request);   // { userId } ou null
```

Ce n'est pas un système d'authentification et il ne sait pas ce qu'est un utilisateur. Il
scelle une valeur et la relit, ce qui est la part dont toute session côté serveur a besoin.

### Le cookie n'est pas votre base de données

Le cookie dit *quelle* ligne regarder. C'est un vrai stockage qui tient les utilisateurs.

```ts
const { userId } = (await session.read(request)) ?? {};
const user = await db.users.findById(userId);
```

Vous pouvez sceller les informations elles-mêmes et éviter la requête, mais alors vous ne
pouvez plus révoquer : désactiver un compte reste sans effet jusqu'à l'expiration du
cookie. Sceller une référence garde la base comme source de vérité, et la requête
supplémentaire vaut généralement ce prix.

### Ce que porte le cookie

`HttpOnly`, donc aucun script ne le lit. `SameSite=Lax` par défaut, ce qui survit à une
navigation de premier niveau revenant d'une connexion externe ; `Strict` le retiendrait
précisément sur cette requête. `Secure` en production, et forcé dès que
`sameSite: 'none'`, car cette valeur est ignorée sans lui. AES-GCM authentifie autant
qu'il chiffre, donc un cookie modifié échoue à s'ouvrir au lieu de se déchiffrer en autre
chose.

`readCookie(request, name)`, du même module, renvoie la valeur brute d'un seul cookie, pour un
cookie que ce helper n'a pas écrit.

## Ce que vous écrivez encore vous-même

`@fluixi/session` est la session client et le cookie. Ce n'est pas un serveur
d'authentification, donc ceci reste à vous :

- **Le hachage des mots de passe.** argon2id ou bcrypt. Ne stockez jamais un mot de passe,
  ne comparez jamais en clair.
- **La table des utilisateurs** et sa lecture.
- **Les routes de connexion, déconnexion et inscription.**
- **Le rate limiting sur la connexion,** pour que l'endpoint ne soit pas un
  oracle à mots de passe.

Si cette liste dépasse ce que vous voulez porter, [OAuth2](/v1/fr/oauth2) la supprime en
déléguant à un fournisseur, et `better-auth` avec `@fluixi/auth` la fournit directement.

## Réagir à une session expirée

Un 401 venant de votre API est le signal qu'une session s'est terminée ailleurs.

```ts
const auth = createSession({
  login,
  fetchUser,
  unauthorized: {
    status: 401,
    // Restreignez, pour qu'un échec de connexion ne se lise pas comme une session expirée.
    shouldHandle: (url) => url.startsWith('/api/') && !url.endsWith('/login'),
    onExpiry: () => navigate('/login?reason=expired'),
  },
});
```

Faites ensuite passer votre couche de données par le fetch de la session, qui est ce qui
applique la règle :

```ts
const response = await auth.guardedFetch('/api/orders');
```

`installGlobal: true` remplace le `fetch` global à la place, pour un SDK qui l'appelle
toujours sans vous laisser de prise. Préférez `guardedFetch` quand vous avez le choix.

`auth.expired()` est positionné quand cela se déclenche, donc la page de connexion peut
dire pourquoi la personne s'y retrouve au lieu d'afficher un formulaire nu.

### Sans session

La règle est exportée seule, pour une couche de données qui ne passe pas par `createSession` :

```ts
import { createFetchGuard } from '@fluixi/session';

export const api = createFetchGuard({
  status: 401,
  shouldHandle: (url) => url.startsWith('/api/') && !url.endsWith('/login'),
  onUnauthorized: () => location.assign('/login?reason=expired'),
});

const orders = await api('/api/orders');
```

Elle renvoie un nouveau `fetch` et ne change rien de global. `onUnauthorized` se déclenche une
seule fois jusqu'à `api.reset()` : dix requêtes qui échouent ensemble signalent une session
expirée, pas dix. `installGlobalFetchGuard(options)` applique la même règle au `fetch` global.
Il ne fait rien côté serveur et renvoie une fonction qui remet l'original.

Suite : **[OAuth2 et OIDC](/v1/fr/oauth2)**.
