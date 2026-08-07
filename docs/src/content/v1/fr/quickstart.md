# Démarrage rapide

Le plus rapide pour obtenir une application qui tourne est le générateur `create-fluixi` :

```bash
npm create fluixi@latest mon-app
# ou : pnpm create fluixi mon-app · yarn create fluixi mon-app
```

Il pose deux questions :

- **Mode d'application** — **SSR** (rendu serveur via `@fluixi/start`) ou **SPA** (côté client via Vite).
- **Syntaxe des templates** — **JSX** (par défaut) ou **html``** (sans JSX, fichiers `.ts` simples).

Ensuite :

```bash
cd mon-app
npm install
npm run dev
```

Vous pouvez aussi ignorer les questions :

```bash
npm create fluixi@latest mon-app -- --ssr --jsx    # ou --spa / --html
```

## JSX ou html`` ?

Fluixi compile **les deux** — JSX et les templates `` html`` `` — vers les mêmes appels DOM à
granularité fine. Choisissez ce que vous préférez, ou mélangez-les dans un même fichier.

```tsx
// JSX — nécessite `jsx` dans le tsconfig
function Counter() {
  const [n, setN] = createSignal(0);
  return <button onClick={() => setN(n() + 1)}>{n()}</button>;
}
```

```ts
// html`` — .ts simple, pas de jsx dans le tsconfig
import { html } from '@fluixi/core';

function Counter() {
  const [n, setN] = createSignal(0);
  return html`<button @click=${() => setN(n() + 1)}>${n()}</button>`;
}
```

Choisissez **html``** quand vous ne voulez pas configurer JSX (par exemple une bibliothèque, un
script, ou une base de code en TypeScript pur). Voir **[templates html``](/v1/fr/html-templates)**
pour la syntaxe complète.

Chaque application générée inclut **[@fluixi/ts-plugin](/v1/fr/html-templates)**, qui apporte un vrai
support TypeScript aux templates `` html`` `` dans votre éditeur — survol, complétion et
vérification de types à l'intérieur du template.

## Ajouter un composant ou une route

Le CLI génère des morceaux dans une application existante, en suivant automatiquement la syntaxe du
projet :

```bash
npx fluixi generate component Button    # → src/components/Button.tsx (ou .ts pour html``)
npx fluixi generate route about         # → src/routes/about.tsx
```

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

Quelle que soit la façon de monter — `render` depuis `@fluixi/core`, ou l'hydratation via
`startClient` — l'élément de montage porte les versions réellement exécutées, également
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
