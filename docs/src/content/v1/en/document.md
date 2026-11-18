# Page document

Every page Fluixi serves starts from a shell: `<html>`, `<head>`, `<body>` and the element the
app renders into. By default that shell is `index.html`, and for most apps it can stay that way.

When the shell needs values from the request, write it as a component instead: `lang` from the
visitor's locale, a theme class read from a cookie, `dir` for a right-to-left language. In
`index.html` those can only be patched in the browser after the page loads, which shows as a
flash.

## Writing the document

Put a component in `src/document.tsx`:

```tsx
import { Html, Head, Main, Scripts, type DocumentProps } from '@fluixi/start/document';

export default function Document(props: DocumentProps) {
  return (
    <Html lang={props.locals.locale ?? 'en'}>
      <Head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body class={props.locals.theme}>
        <Main />
        <Scripts />
      </body>
    </Html>
  );
}
```

An app written with `html` templates uses `src/document.ts`:

```ts
import { html } from '@fluixi/core';
import { Html, Head, Main, Scripts, type DocumentProps } from '@fluixi/start/document';

export default function Document(props: DocumentProps) {
  return html`<${Html} lang=${props.locals.locale ?? 'en'}>
    <${Head}><meta charset="utf-8" /></${Head}>
    <body><${Main} /><${Scripts} /></body>
  </${Html}>`;
}
```

When the file exists it replaces `index.html`, which you can then delete. Point to another file
with `document` in `fluixi.config.ts`, or set `document: null` to keep `index.html` while a
document file sits in `src/`.

## The parts

| Part | Renders |
| --- | --- |
| `Html` | the `<html>` element, with the attributes you give it |
| `Head` | the `<head>`: Fluixi's inline scripts first, then your children, then the styles and preloads of the build |
| `Main` | the element the app renders into, the only part of the page that hydrates |
| `Scripts` | the client entry |

`Main` is required: a document without it fails with a message naming the file. The others place
what Fluixi adds; leave one out and that content is missing from the page.

The component receives the request it renders for:

| Prop | |
| --- | --- |
| `request` | the Web `Request` |
| `url` | its URL, parsed |
| `locals` | what [middleware](/v1/en/middleware) put on the request |

`locals` holds `unknown` values until you declare what your middleware sets:

```ts
declare module '@fluixi/dom' {
  interface RequestLocals {
    locale?: string;
    theme?: string;
  }
}
```

## What runs where

The document renders on the server, for every request, after the middleware chain. It never
reaches the browser as code: only the app inside `Main` hydrates. Everything that works with
`index.html` works the same way with it, streaming, [`seo()`](/v1/en/seo) tags, route preloads,
the response status.

So the document has no state and no event handlers, and it renders once per request. An
attribute that has to change while the page is open, a theme switcher for instance, belongs to
the app: [`seo()`](/v1/en/seo) sets attributes on `<html>` from any page.

If the document throws, the response is the plain error page, since there is no shell to render
it in. Your `public/error.html` takes precedence, as it does for any failed request.

## Single-page apps and prerendering

With `ssr: false` there is no render per request: the build renders the document once, for `/`
with empty locals, to `dist/client/index.html`, and that file is served for every path. Values
that depend on the request are not available there.

[Prerendered pages](/v1/en/static-generation) render through the server path, so each one gets
the document rendered for its own URL.

All the deployment adapters support the document.

Next: **[Images](/v1/en/images)**.
