# Démarrage rapide

Le plus rapide pour obtenir une application qui tourne est le générateur `create-fluixi` :

```bash
npm create fluixi@latest mon-app
# ou : pnpm create fluixi mon-app · yarn create fluixi mon-app
```

Il pose ces questions, dans l'ordre :

- **Mode d'application**, SSR (rendu serveur via `@fluixi/start`) ou SPA (côté client via Vite)
- **Syntaxe des templates**, JSX (par défaut) ou html`` (sans JSX, fichiers `.ts` simples)
- **Bibliothèque de composants**, aucune ou `@fluixi-ui` (kit et tokens ; composants installés au besoin)
- **Styles**, CSS simple, Tailwind CSS v4, ou `@fluixi-css`
- **Authentification, apps SSR seulement**, aucune, OAuth2/OIDC (fournisseur d'identité, puis tokens dans le navigateur ou sur le serveur), ou Better Auth

Ensuite :

```bash
cd mon-app
npm install
npm run dev
```

Les nouvelles applications démarrent sur Vite 8 et TypeScript 7. Vite 8 demande Node 20.19 ou
plus, ou 22.12 ou plus.

Vous pouvez aussi ignorer les questions :

```bash
npm create fluixi@latest mon-app -- --ssr --jsx    # ou --spa / --html
npm create fluixi@latest mon-app -- --ssr --auth=oauth2 --provider=keycloak --tokens=server
```

Chaque question possède son option. Une question réglée en ligne de commande n'est pas posée. Les
options d'authentification sont : `--auth=oauth2`, `--auth=better-auth` ou `--no-auth`. Avec
`oauth2`, les options `--provider` et `--tokens` sont facultatives. Google et Dex conservent les
tokens sur le serveur ; l'usage de `--tokens=browser` avec eux est refusé. L'authentification
nécessite une application SSR ; l'option `--spa` combinée à `--auth` est refusée.

## JSX ou html`` ?

Fluixi compile **les deux**, JSX et les templates `` html`` ``, vers les mêmes appels DOM à
granularité fine. Choisissez ce que vous préférez, ou mélangez-les dans un même fichier.

```tsx
// JSX, nécessite `jsx` dans le tsconfig
function Counter() {
  const n = $signal(0);
  return <button onClick={() => n.set(n() + 1)}>{n()}</button>;
}
```

```ts
// html``, .ts simple, pas de jsx dans le tsconfig
import { html } from '@fluixi/core';

function Counter() {
  const n = $signal(0);
  return html`<button @click=${() => n.set(n() + 1)}>${n()}</button>`;
}
```

Choisissez **html``** quand vous ne voulez pas configurer JSX (par exemple une bibliothèque, un
script, ou une base de code en TypeScript pur). Voir **[templates html``](/v1/fr/html-templates)**
pour la syntaxe complète.

Chaque application générée inclut **[@fluixi/ts-plugin](/v1/fr/html-templates)**, qui apporte un vrai
support TypeScript aux templates `` html`` `` dans votre éditeur, survol, complétion et
vérification de types à l'intérieur du template. Il tourne dans le TypeScript intégré à l'éditeur,
y compris pour un projet en TypeScript 7 : voir
[Prise en charge de l'éditeur](/v1/fr/html-templates#prise-en-charge-de-léditeur).

## Ajouter un composant ou une route

Le CLI génère des morceaux dans une application existante, en suivant automatiquement la syntaxe du
projet :

```bash
npx fluixi generate component Button    # → src/components/Button.tsx (ou .ts pour html``)
npx fluixi generate route about         # → src/routes/about.tsx
```

## Ajouter l'authentification

```bash
npx fluixi add auth                                              # pose les questions
npx fluixi add auth oauth2 --provider keycloak --tokens server
npx fluixi add auth better-auth --no-install
```

La commande `fluixi add auth` pose les questions nécessaires, écrit le branchement
d'authentification et installe le paquet requis. Elle demande si vous utilisez OAuth2/OIDC ou Better
Auth, puis, pour OAuth2, le fournisseur et l'emplacement des tokens, à moins que les options
fournies ne répondent déjà à ces besoins. Elle crée les mêmes fichiers que `create-fluixi` pour une
nouvelle application, conserve les fichiers existants et affiche les lignes de configuration à
ajouter lorsqu'elle ne peut pas les modifier. Le paquet est installé avec le gestionnaire de paquets
du projet, sauf si l'option `--no-install` est utilisée. Ensuite, il vous suffit de copier
`.env.example` en `.env` et d'enregistrer l'URI de redirection chez le fournisseur ; les liens
utiles sont [OAuth2](/v1/fr/oauth2) et [Better Auth](/v1/fr/better-auth).

## Partir de zéro

Si vous préférez tout câbler vous-même, installez le runtime et le plugin Vite :

```bash
npm install @fluixi/core
npm install -D @fluixi/vite-plugin vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({ plugins: [fluixi()] });
```

```ts
// src/main.ts
import { render, html } from '@fluixi/core';
import { App } from './app';

render(() => html`<${App} />`, document.getElementById('app')!);
```

## Quelle version est en cours d'exécution ?

Quelle que soit la façon de monter, `render` depuis `@fluixi/core`, ou l'hydratation via
`startClient`, l'élément de montage porte les versions réellement exécutées, également
exposées dans `window.Fluixi` :

```html
<div id="app" fluixi="1.0.0" fx-dom="1.0.0" fx-reactive="1.0.0">
```

```js
> window.Fluixi
{ core: '1.0.0', dom: '1.0.0', reactive: '1.0.0' }
```

Ces trois paquets sortent comme une seule release. S'ils divergent, la console le signale :
un décalage signifie un lockfile obsolète ou deux copies résolues côte à côte, ce qui
autrement se manifeste bien plus tard sous forme de réactivité incompréhensible.

Continuez avec **[Signaux](/v1/fr/signals)** pour le cœur réactif, ou passez aux
**[templates html``](/v1/fr/html-templates)**.
