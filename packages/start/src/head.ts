/**
 * `@fluixi/start/head`: the app-facing SEO & document-head surface, re-exported from the
 * framework-agnostic `@fluixi/head` engine. Importing from the meta-framework gives apps a single,
 * stable dependency (like `@fluixi/start/router`) instead of reaching into the engine directly:
 *
 *   import { seo, jsonld, Title, Meta, Link, JsonLD } from '@fluixi/start/head';
 *
 *   seo({ title: 'Home', description: '…', canonical: 'https://site.com/' });
 *
 * SSR injection, route `seo` exports + nested-layout inheritance, and build-time
 * robots.txt/sitemap.xml emission are wired through @fluixi/start (see server + build).
 */
export * from '@fluixi/head';
