# SEO et en-tête de document

`@fluixi/start/head` gère tout ce qui se trouve entre `<head>` et `</head>`, titre, meta,
Open Graph, données structurées, avec des valeurs résolues sur le serveur : un robot les
voit dans le HTML, pas après hydratation.

```tsx
import { seo } from '@fluixi/start/head';

export default function Post() {
  seo({
    title: 'La réactivité compilée',
    description: 'Comment Fluixi transforme les templates en appels DOM ciblés.',
    canonical: 'https://example.com/blog/reactivite-compilee',
  });

  return <article>...</article>;
}
```

`seo` est un alias de `useHead` ; utilisez celui qui se lit le mieux à cet endroit.

## La composition suit l'arbre

Appelez-la dans un layout pour les valeurs par défaut, et dans une page pour les
spécificités. La valeur la plus spécifique l'emporte, tout le reste est hérité :

```tsx
// src/routes/layout.tsx
seo({ titleTemplate: '%s · Fluixi', og: { siteName: 'Fluixi' } });

// src/routes/blog/[slug].tsx
seo({ title: 'La réactivité compilée' });   // → « La réactivité compilée · Fluixi »
```

`titleTemplate` est hérité et appliqué au titre le plus spécifique : une section définit
donc son cadre une fois, au lieu que chaque page le répète. Il accepte aussi une fonction
quand `%s` ne suffit pas.

## Valeurs réactives

Tout champ susceptible de changer accepte un accesseur, et le document se met à jour :

```tsx
seo({ title: () => `${unread()} non lus` });
```

Lors d'une transition de route, l'en-tête de la page précédente est retiré
automatiquement, l'enregistrement est lié au propriétaire, quitter la page retire donc ce
qu'elle avait ajouté.

## Ce qui est de première classe

Plutôt que de vous faire assembler des balises meta, les plus courantes sont des champs
typés :

```tsx
seo({
  title: 'Tarifs',
  description: 'Offres et tarifs.',
  keywords: ['tarifs', 'offres'],
  canonical: 'https://example.com/tarifs',
  robots: { index: true, follow: true },
  lang: 'fr',
  themeColor: '#0d9488',

  og: { type: 'website', image: 'https://example.com/og.png', siteName: 'Fluixi' },
  twitter: { card: 'summary_large_image', site: '@fluixi' },

  alternates: [{ hreflang: 'en', href: 'https://example.com/pricing' }],
  feeds: [{ href: '/rss.xml', title: 'Blog' }],
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
  verification: { google: '...' },
});
```

Les données structurées sont un champ elles aussi : passez un objet ou un tableau, elles
sont émises en `application/ld+json` :

```tsx
seo({
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'La réactivité compilée',
  },
});
```

## Échappatoires

Tout ce qui n'est pas de première classe passe par `meta`, `link` et `script` :

```tsx
seo({
  meta: [{ name: 'fediverse:creator', content: '@fluixi@example.social' }],
  link: [{ rel: 'preconnect', href: 'https://fonts.example.com' }],
  script: [{ src: 'https://analytics.example.com/s.js', defer: 'true' }],
});
```

Les attributs de `<html>` autres que `lang` passent par `htmlAttrs`. Le serveur les rend avec
la page et le client les tient à jour : c'est ainsi qu'un thème atteint le document avant
l'affichage.

```tsx
seo({ htmlAttrs: { 'data-theme': () => theme() } });
```

`themeColor` prend une couleur, ou une par media query, pour les barres du navigateur sur Android
et iOS. Une page qui suit le système envoie les deux :

```tsx
seo({
  themeColor: [
    { color: '#ffffff', media: '(prefers-color-scheme: light)' },
    { color: '#0a0a0a', media: '(prefers-color-scheme: dark)' },
  ],
  colorScheme: 'light dark',
});
```

[Thèmes](/v1/fr/theming) fait les deux pour vous, avec l'attribut.

## Composants

Pour du code en forme de balisage, des composants couvrent le même terrain, `Title`,
`Meta`, `HeadLink`, `Script`, `Base`, `JsonLD`. Ils n'affichent rien et s'enregistrent dans le
même registre : ils se composent donc avec les appels à `seo` et se dédupliquent avec eux.

```tsx
import { Title, Meta } from '@fluixi/start/head';

<>
  <Title>Tarifs</Title>
  <Meta name="description" content="Offres et tarifs." />
</>
```

## Déduplication

Les sources sont fusionnées et dédupliquées par identité avant le rendu : un seul
`<title>`, un seul lien canonique, un seul `og:image`, celui défini par l'appelant le plus
spécifique. C'est ce qui rend les valeurs par défaut d'un layout sûres : une page qui
redéfinit `description` la remplace au lieu d'émettre une seconde balise.

Ensuite : **[Document de page](/v1/fr/document)**.
