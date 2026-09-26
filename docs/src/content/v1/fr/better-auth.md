# Better Auth

`@fluixi/auth` intègre [Better Auth](https://better-auth.com), pour une application qui
*est* le système d'identité : sa propre table d'utilisateurs, la liaison de comptes, le
double facteur, les organisations, et le mot de passe à côté de la connexion sociale.

Better Auth possède les utilisateurs, les sessions et les routes. `@fluixi/auth` le relie à
Fluixi : un middleware qui résout la session par requête, un handler à monter, et les
mêmes hooks que les deux autres approches.

C'est la plus lourde des trois, et la bonne quand vous voulez une table d'utilisateurs que
vous contrôlez. Si un fournisseur doit être le seul système d'identité,
[OAuth2](/v1/fr/oauth2) est plus léger. Si vous voulez écrire la connexion vous-même,
[Sessions](/v1/fr/session) l'est encore plus.

## Installation

`better-auth` est une peer dependency, vous choisissez donc la version :

```bash
npm i @fluixi/auth better-auth
```

Elle demande une base de données. Suivez la documentation de Better Auth pour l'adaptateur
et le schéma ; cette page ne couvre que le côté Fluixi.

## Le serveur

Créez l'instance Better Auth comme sa documentation l'indique, puis passez-la une fois à
`defineAuth` :

```ts
// src/lib/auth.server.ts
import { betterAuth } from 'better-auth';
import { defineAuth } from '@fluixi/auth/server';

export const auth = defineAuth(
  betterAuth({
    database: /* votre adaptateur */,
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
    },
  }),
);
```

`defineAuth` enregistre l'instance pour que le middleware et le handler de routes la
trouvent, et renvoie un petit wrapper :

```ts
auth.raw          // l'instance Better Auth, pour ce que le wrapper ne couvre pas
auth.handler      // à monter sur /api/auth/*
auth.getSession   // résout la session d'une requête
```

### Monter les routes

Better Auth sert ses propres endpoints pour la connexion, l'inscription, la
déconnexion, les callbacks OAuth et le reste. Donnez-lui la route catch-all :

```ts
// src/api/auth/[...all].ts
import { mountAuthRoutes } from '@fluixi/auth/server';

const handler = mountAuthRoutes();

export const GET = handler;
export const POST = handler;
```

Un serveur construit ne distribue vers `src/api` que si l'entrée serveur réexporte les
gestionnaires, donc vérifiez la présence de cette ligne :

```ts
// src/entry-server.ts
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
```

Les applications générées la contiennent, et une compilation échoue en nommant la ligne si
elle manque.

### Le middleware

```ts
// src/middleware.ts
import { defineMiddleware } from '@fluixi/start';
import { authMiddleware } from '@fluixi/auth/server';
import './lib/auth.server.js';   // pour que defineAuth se soit exécuté

export default defineMiddleware([authMiddleware()]);
```

`authMiddleware` résout la session et la place dans les locals de la requête, sous la clé
que lisent les hooks côté client. C'est ce qui fait répondre `useUser()` pendant un
rendu serveur au lieu de se remplir après l'hydratation, et ce qui permet à un guard de
refuser une page avant qu'aucun HTML ne soit produit.

Importer le module qui appelle `defineAuth` compte. Sans cela le middleware n'a aucune
instance à interroger.

## Le client

```ts
// src/lib/auth.ts
import { createAuthClient } from 'better-auth/client';
import { createAuthHooks } from '@fluixi/auth/client';
import { useNavigate } from '@fluixi/start/router';

const client = createAuthClient({ baseURL: '/api/auth' });

export const { protectedRoute, Can, Protect, useUser, useAuth, useSignIn, useSignOut } =
  createAuthHooks({
    client,
    navigate: { handler: useNavigate },
    loginPath: '/login',
    homePath: '/dashboard',
  });
```

Notez `client` et non `session`. `createAuthHooks` accepte les deux : un client Better
Auth, ou n'importe quelle session réactive comme celles que produisent `@fluixi/session` et
`@fluixi/oauth2`. C'est pourquoi les pages voisines décrivent les mêmes guards.

### Se connecter

```tsx
export default function Login() {
  const signIn = useSignIn();
  const email = signal('');
  const password = signal('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); void signIn({ email: email(), password: password() }); }}>
      <input type="email" value={email()} onInput={(e) => email.set(e.currentTarget.value)} />
      <input type="password" value={password()} onInput={(e) => password.set(e.currentTarget.value)} />
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

Contrairement au flux OAuth2, le formulaire est le vôtre et les identifiants vont à votre
propre serveur. Better Auth les vérifie, crée la session et pose son cookie.

### Lire et protéger

Identique aux autres approches :

```tsx
export default protectedRoute(Dashboard);
export default protectedRoute(AdminPage, { role: 'admin' });

const user = useUser();
<span>{() => user()?.email ?? 'Déconnecté'}</span>

const signOut = useSignOut();
<button onClick={() => signOut()}>Se déconnecter</button>
```

## Connexion sociale

Configurez le fournisseur sur l'instance Better Auth, puis démarrez le flux via son client.
Better Auth gère la redirection et le callback sur ses propres routes : il n'y a donc aucune
page de callback à écrire.

```ts
await client.signIn.social({ provider: 'github', callbackURL: '/dashboard' });
```

La session qui en résulte est celle de Better Auth, stockée dans votre base, avec un compte
lié au compte GitHub. C'est la différence avec `@fluixi/oauth2`, où le fournisseur reste le
seul système d'identité et où rien n'est stocké localement.

## Les rôles

Better Auth place un `role` sur l'utilisateur quand vous en configurez un. Les hooks le
lisent sans configuration supplémentaire :

```ts
useAuth().roles();   // ['admin'], depuis user.role
```

Pour un modèle de permissions plus riche, donnez à `createAuthHooks` une session dont vous
contrôlez le `can`, ou dérivez les permissions dans votre propre code. Les aides RBAC de
[Sessions](/v1/fr/session#rôles-et-permissions) en décrivent la forme.

Comme partout, un rôle côté client décide de ce qu'il faut afficher. Ce sont les contrôles
serveur de Better Auth qui décident de ce qui est autorisé.

## Lectures côté serveur

Dans une fonction serveur ou une route d'API, interrogez l'instance directement plutôt que
les hooks :

```ts
import { getAuth } from '@fluixi/auth/server';

export async function GET(request: Request) {
  const { user } = await getAuth().getSession(request);
  if (!user) return new Response(null, { status: 401 });

  return Response.json(await ordersFor(user.id));
}
```

Quand `authMiddleware` s'est déjà exécuté, la même session est dans les locals de la
requête, donc un rendu la lit sans seconde recherche.

Pour refuser plutôt que lire, `requireUser`, `requireRole` et `requirePermission` répondent
401 ou 403 à votre place ; voir [Authentification](/v1/fr/authentication#côté-serveur).

## Choisir entre celle-ci et les autres

| | Better Auth | `@fluixi/oauth2` | `@fluixi/session` |
| --- | --- | --- | --- |
| Comptes utilisateurs | à vous, dans votre base | aucun, le fournisseur les détient | à vous |
| Sessions | celles de Better Auth | les vôtres | les vôtres |
| Page de connexion | la vôtre | celle du fournisseur | la vôtre |
| Base de données requise | oui | non | pour le cookie |
| Serveur requis | oui | non, en mode navigateur | pour le cookie |
| Liaison de comptes, 2FA, orgs | fourni | non | à écrire |

Better Auth sait déléguer la connexion à Keycloak via son plugin OAuth générique, mais la
session qu'il émet reste la sienne. Le faire tourner uniquement pour relayer la connexion
d'un fournisseur revient à tenir deux stockages d'identité là où un seul suffirait.

Suite : **[Service à service](/v1/fr/service-to-service)**.
