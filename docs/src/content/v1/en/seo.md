# SEO and the document head

`@fluixi/start/head` manages everything between `<head>` and `</head>`, title, meta,
Open Graph, structured data, with the values resolved on the server so a crawler sees them
in the HTML, not after hydration.

```tsx
import { seo } from '@fluixi/start/head';

export default function Post() {
  seo({
    title: 'Compiled reactivity',
    description: 'How Fluixi turns templates into targeted DOM calls.',
    canonical: 'https://example.com/blog/compiled-reactivity',
  });

  return <article>...</article>;
}
```

`seo` is an alias for `useHead`; use whichever reads better where you are.

## It composes down the tree

Call it in a layout for the defaults and in a page for the specifics. The most specific
value wins, and everything else is inherited:

```tsx
// src/routes/layout.tsx
seo({ titleTemplate: '%s · Fluixi', og: { siteName: 'Fluixi' } });

// src/routes/blog/[slug].tsx
seo({ title: 'Compiled reactivity' });   // → "Compiled reactivity · Fluixi"
```

`titleTemplate` is inherited and applied to the most specific title, so a section can set
its own frame once rather than every page repeating it. It also accepts a function when
`%s` is not expressive enough.

## Reactive values

Any field that can sensibly change accepts an accessor, and the document updates when it
does:

```tsx
seo({ title: () => `${unread()} unread` });
```

On a route transition the previous page's head is dropped automatically, the registration
is tied to the owner, so leaving the page removes what it added.

## What is first-class

Rather than making you assemble meta tags, the common ones are typed fields:

```tsx
seo({
  title: 'Pricing',
  description: 'Plans and pricing.',
  keywords: ['pricing', 'plans'],
  canonical: 'https://example.com/pricing',
  robots: { index: true, follow: true },
  lang: 'en',
  themeColor: '#0d9488',

  og: { type: 'website', image: 'https://example.com/og.png', siteName: 'Fluixi' },
  twitter: { card: 'summary_large_image', site: '@fluixi' },

  alternates: [{ hreflang: 'fr', href: 'https://example.com/fr/pricing' }],
  feeds: [{ href: '/rss.xml', title: 'Blog' }],
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
  verification: { google: '...' },
});
```

Structured data is a field too: pass an object or an array and it is emitted as
`application/ld+json`:

```tsx
seo({
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Compiled reactivity',
  },
});
```

## Escape hatches

Anything not first-classed goes through `meta`, `link` and `script`:

```tsx
seo({
  meta: [{ name: 'fediverse:creator', content: '@fluixi@example.social' }],
  link: [{ rel: 'preconnect', href: 'https://fonts.example.com' }],
  script: [{ src: 'https://analytics.example.com/s.js', defer: 'true' }],
});
```

Attributes on `<html>` other than `lang` go in `htmlAttrs`. The server renders them with the
page and the client keeps them current, which is how a theme reaches the document before
paint:

```tsx
seo({ htmlAttrs: { 'data-theme': () => theme() } });
```

`themeColor` takes one colour, or one per media query, for the browser's own bars on Android and
iOS. A page that follows the OS sends both:

```tsx
seo({
  themeColor: [
    { color: '#ffffff', media: '(prefers-color-scheme: light)' },
    { color: '#0a0a0a', media: '(prefers-color-scheme: dark)' },
  ],
  colorScheme: 'light dark',
});
```

[Theming](/v1/en/theming) does both for you, along with the attribute.

## Components

For markup-shaped code there are components covering the same ground, `Title`, `Meta`,
`Link`, `Script`, `Base`, `JsonLD`. They render nothing and register into the same
registry, so they compose with `seo` calls and dedupe against them.

```tsx
import { Title, Meta } from '@fluixi/start/head';

<>
  <Title>Pricing</Title>
  <Meta name="description" content="Plans and pricing." />
</>
```

## Deduplication

Sources are merged and deduplicated by identity before rendering, one `<title>`, one
canonical link, one `og:image`, whichever the most specific caller set. That is what makes
layout defaults safe: a page overriding `description` replaces it rather than emitting a
second tag.

Next: **[Page document](/v1/en/document)**.
