# Quick start

The fastest way to a running app is the `create-fluixi` scaffolder:

```bash
npm create fluixi@latest my-app
# or: pnpm create fluixi my-app · yarn create fluixi my-app
```

The scaffolder asks the following questions in order:

- **App mode**, **SSR** (server-rendered via `@fluixi/start`) or **SPA** (client-only via Vite)
- **Template syntax**, **JSX** (default) or **html``** (plain `.ts` files, no JSX)
- **Component library**, **none** or **`@fluixi-ui`** (kit and tokens; components installed as needed)
- **Styling**, **plain CSS**, **Tailwind CSS v4**, or **`@fluixi-css`**
- **Authentication**, **none**, **OAuth2/OIDC** (identity provider, tokens in browser or on server), or **Better Auth** (SSR apps only)

Then:

```bash
cd my-app
npm install
npm run dev
```

You can also skip the prompts:

```bash
npm create fluixi@latest my-app -- --ssr --jsx    # or --spa / --html
npm create fluixi@latest my-app -- --ssr --auth=oauth2 --provider=keycloak --tokens=server
```

Each question is represented by a flag, so any question answered on the command line is not asked
again. Authentication flags include `--auth=oauth2`, `--auth=better-auth`, or `--no-auth`; when
using `oauth2` you can also give `--provider` and `--tokens`. Google and Dex store tokens on the
server, therefore `--tokens=browser` is refused with those providers, and an SSR app is required for
authentication, so `--spa` combined with `--auth` is refused.

## JSX or html``?

Fluixi compiles **both** JSX and tagged `` html`` `` templates to the same fine-grained DOM
calls. Pick whichever you prefer, or mix them in one file.

```tsx
// JSX, needs `jsx` configured in tsconfig
function Counter() {
  const n = $signal(0);
  return <button onClick={() => n.set(n() + 1)}>{n()}</button>;
}
```

```ts
// html``, plain .ts, no jsx in tsconfig
import { html } from '@fluixi/core';

function Counter() {
  const n = $signal(0);
  return html`<button @click=${() => n.set(n() + 1)}>${n()}</button>`;
}
```

Choose **html``** when you don't want to configure JSX (for example a library, a script, or a
plain-TypeScript codebase). See **[html`` templates](/v1/en/html-templates)** for the full syntax.

Every scaffolded app includes **[@fluixi/ts-plugin](/v1/en/html-templates)**, which gives `` html`` ``
templates real TypeScript support in your editor, hover, completion and type-checking inside the
template.

## Add a component or route

The CLI scaffolds pieces into an existing app, matching your project's syntax automatically:

```bash
npx fluixi generate component Button    # → src/components/Button.tsx (or .ts for html``)
npx fluixi generate route about         # → src/routes/about.tsx
```

## Add authentication

```bash
npx fluixi add auth                                              # asks
npx fluixi add auth oauth2 --provider keycloak --tokens server
npx fluixi add auth better-auth --no-install
```

The command asks whether you want OAuth2/OIDC or Better Auth, then prompts for the OAuth2 provider
and token location unless flags answer them, with the same flags as `create-fluixi`. It writes the
same files that `create-fluixi` creates for a new app, preserving any existing files and printing
lines to add to uneditable configs. The package is installed with the project's package manager,
unless `--no-install` is used. Then copy `.env.example` to `.env` and register the redirect URI with
the provider. See the documentation for [OAuth2](/v1/en/oauth2) and [Better
Auth](/v1/en/better-auth).

## Starting from scratch

If you'd rather wire it up yourself, install the runtime and the Vite plugin:

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

## Which build am I running?

Whichever way you mount, `render` from `@fluixi/core`, or hydration through
`startClient`, the mount element is stamped with the versions actually running, and they
are exposed as `window.Fluixi`:

```html
<div id="app" fluixi="1.0.0" fx-dom="1.0.0" fx-reactive="1.0.0">
```

```js
> window.Fluixi
{ core: '1.0.0', dom: '1.0.0', reactive: '1.0.0' }
```

These three ship as one release. If they disagree, the console says so, a mismatch means
a stale lockfile or two copies resolved side by side, which otherwise surfaces much later
as reactivity that makes no sense.

Continue to **[Signals](/v1/en/signals)** for the reactive core, or jump to
**[html`` templates](/v1/en/html-templates)**.
