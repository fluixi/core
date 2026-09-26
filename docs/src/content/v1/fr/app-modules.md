# Modules d'application

Ce qu'une application fournit se déclare une fois, dans `src/app.config.ts`. `@fluixi/start`
l'enregistre avant que l'une ou l'autre entrée ne tourne, donc `entry-client` et
`entry-server` restent libres de toute mise en place et ne peuvent pas diverger à son sujet.

```ts
// src/app.config.ts
import { defineApp } from '@fluixi/start/app';
import { AuthModule } from './services/auth.js';

export default defineApp({ imports: [AuthModule] });
```

Sans cela, un provider racine devait être enregistré dans les deux entrées. Oublier celle du
serveur ne dit rien : le rendu serveur lève une erreur, retombe sur le client, et la page est
seulement plus lente.

## Les modules

Un module est une liste nommée de ce dont une fonctionnalité a besoin :

```ts
import { defineModule } from '@fluixi/start/app';
import { injectionToken } from '@fluixi/start/di';

export const Clock = injectionToken<() => Date>('Clock');

export const ClockModule = defineModule({
  name: 'clock',
  providers: [{ provide: Clock, useValue: () => new Date() }],
});

export const ReportsModule = defineModule({
  name: 'reports',
  imports: [ClockModule],
  providers: [],
});
```

Les `imports` sont enregistrés d'abord, et chaque module une seule fois, quel que soit le
nombre de modules qui l'importent. Un cycle est une erreur qui nomme les modules concernés. Les
`providers` de l'application viennent en dernier, donc ils l'emportent sur ceux d'un module.
Tout arrive dans l'injecteur racine : une instance dans le navigateur, une par requête côté
serveur (voir [Injection de dépendances](/v1/fr/dependency-injection)). Un module n'est pas un
scope. Pour des services limités à une partie de la page, appelez `provide()` dans un
composant.

Un paquet peut livrer un module, et c'est tout leur intérêt : `authModule` de `@fluixi/oauth2`
rend le service d'authentification d'une application injectable en une ligne. Voir
[OAuth2](/v1/fr/oauth2).

## La moitié serveur

`src/app.config.server.ts` a la même forme et n'est enregistré que côté serveur :

```ts
// src/app.config.server.ts
import { defineApp } from '@fluixi/start/app';
import { authServer } from './services/auth.server.js';

export default defineApp({ imports: [authServer()] });
```

C'est un fichier à part à cause de ce qu'un build navigateur fait d'une référence. Du code
serveur nommé depuis `app.config.ts`, même par un `import()` différé, est émis comme un chunk
dans `dist/client`, publié qu'il s'exécute un jour ou non. Seul le build serveur importe ce
fichier.

Un module peut porter du `middleware`. Il passe avant `src/middleware.ts`, les modules dans
l'ordre des `imports`. Un middleware ne tourne que côté serveur, donc un module qui en porte a
sa place ici ; listé dans `app.config.ts`, il émet un avertissement en développement.

## Les fichiers `.server`

Tout fichier nommé `*.server.*` est réservé au serveur. Le build navigateur échoue si du code
applicatif en importe un, en nommant le fichier qui l'a fait, et un `import()` différé compte :

```text
src/routes/login.tsx imports src/services/auth/verify.server.ts into the browser bundle.
```

Mettez un vérificateur de tokens, un client de base de données ou tout ce qui lit un secret
dans un fichier `.server`, et l'erreur de l'importer dans une page arrête le build au lieu
d'être publiée. Un fichier dont la première instruction est `"use server"` est permis : le
navigateur reçoit des appels au serveur, pas le code. Les dépendances de `node_modules` ne sont
pas contrôlées.

Suite : **[Variables d'environnement](/v1/fr/environment)**.
