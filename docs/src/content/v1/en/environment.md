# Environment variables

Which values reach the browser is declared, not spelled. An app lists the public ones in
`fluixi.config.ts`; everything else stays on the server, whatever it is called.

```ts
// fluixi.config.ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  env: {
    public: ['AUTH_ISSUER', 'AUTH_CLIENT_ID', 'AUTH_TOKENS', 'API_URL', 'APP_URL'],
  },
});
```

Vite's convention puts the decision in the name: a `VITE_` prefix publishes the value. Moving
a value between server and browser then renames every reference, and a secret named
`VITE_API_SECRET` ships whether anything reads it or not. A list means a secret can only reach
the bundle by being written into it.

## Reading them

```ts
import { publicEnv, serverEnv } from '@fluixi/start/env';

const { API_URL } = publicEnv();                                    // anywhere
const secret = serverEnv('SESSION_SECRET', { required: true });     // server only
```

`publicEnv()` works on both sides and returns the same frozen set on each. In the browser the
build has defined it as a literal. On the server it reads `process.env`, narrowed to the same
declared names, so a loader cannot use a value the browser will not have. It also works when
the server imports `@fluixi/start` from `node_modules` instead of bundling it, which is the
default for a published install: there `import.meta.env` is undefined, and code reading it
breaks in production only.

`serverEnv(name)` reads one server-only variable. In a browser it throws instead of returning
`undefined`, because a secret read as `undefined` becomes a request sent without credentials,
and the failure then points at the request instead of at the read. `{ required: true }` also
throws when the variable is unset, naming it.

## One reader for both sides

```ts
const api = $env('API_URL');                                // string | undefined
const secret = $env('SESSION_SECRET', { required: true });  // string
```

`$env` compiles to `env` from `@fluixi/start/env`, with no import to write; import `env`
yourself, under any name, if you prefer. On the server it reads any variable. In the browser
only the public set exists, so the browser build refuses a secret at the line that reads it,
and a name the build could not see, one computed at run time, throws when it runs. A branch
only the server takes, behind `import.meta.env.SSR` or `typeof window === 'undefined'`, is left
alone, and so is a `"use server"` function or a `.server` file, whose code never reaches the
browser.

`publicEnv()` and `serverEnv()` stay for code that wants its intent on the page: a reviewer
reading `serverEnv('STRIPE_KEY')` knows it is a secret without looking anything up.

## A config object in one declaration

```ts
// src/config/env.ts
import { pickEnv, asNumber } from '@fluixi/start/env';

export const config = pickEnv({
  apiUrl: 'API_URL',                                            // string, required
  authServiceUrl: { key: 'AUTH_SERVICE_URL', default: '' },     // string
  pageSize: { key: 'PAGE_SIZE', default: 20, parse: asNumber }, // number
  sentryDsn: { key: 'SENTRY_DSN', optional: true },             // string | undefined
});
```

A bare key is a required string. `default` fills in when the variable is unset, `optional` lets
it be `undefined`, and `parse` decides the type; each field's type follows from its entry. Every
missing or invalid variable is reported in one error, so a new deployment learns its whole list
at once rather than one restart at a time. The result is frozen.

`asNumber`, `asBoolean`, `asList` and `asUrl` refuse what they cannot read: `PAGE_SIZE=twelve`
fails at startup instead of becoming `NaN` in a query. Each field is read through `env()`, so
the browser build checks these keys like any other read.

### Typed keys

`@fluixi/start` writes the declared names into `src/fluixi-env-vars.d.ts`, with the server
variable names from your `.env` files beside them, names only. `publicEnv().` and `$env('` then
complete them in the editor, and an undeclared name is a type error before it is a build error.
Each key is `string | undefined`, since a declared variable can still be unset. With nothing
declared, `publicEnv()` stays a plain record.

A key known only at run time needs its type:

```ts
import { publicEnv, type PublicEnv } from '@fluixi/start/env';

const read = (key: keyof PublicEnv) => publicEnv()[key];
```

## Where the values come from

`fluixi dev` and `fluixi start` load `.env`, `.env.local`, `.env.<mode>` and
`.env.<mode>.local` into `process.env` on the server, every variable, prefixed or not. A
variable already set in the real environment wins over the files, which is how a deployment's
own secrets override a developer's `.env`.

## The `VITE_` prefix

It keeps working. A declared name is found under its bare spelling or with `VITE_` in front,
bare first, so `.env` can move one variable at a time: `AUTH_ISSUER` in `env.public` reads
`VITE_AUTH_ISSUER` until it is renamed. Anything already prefixed stays public, as it always
was.

## What stops a secret shipping

The list is the protection. Four checks catch the line written in a hurry:

| Check | When | What happens |
| --- | --- | --- |
| a name in `env.public` reads like a secret (`SECRET`, `PASSWORD`, `PRIVATE_KEY`, `CREDENTIALS`) | build | refused, naming it |
| a `VITE_` variable in any `.env` file reads like a secret | `fluixi build` | refused; `fluixi dev` warns |
| `publicEnv().X` in browser code, `X` not declared (a typo, or a server-only value) | build | refused, naming the file, line and variable |
| `serverEnv()` called in the browser | run time | throws |

For a name that only reads like a secret, `FLUIXI_ALLOW_PUBLIC_SECRETS=true` lets the build
through.

Next: **[SEO and the document head](/v1/en/seo)**.
