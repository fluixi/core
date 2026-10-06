// Sidebar structure (ordered) + UI strings per language. Page titles come from each markdown's
// H1 (see content.ts); group labels and chrome are translated here.
import { VERSION } from '@fluixi/core';
import { has, VERSIONS, type Lang } from './content.js';

export const NAV: { group: Record<Lang, string>; slugs: string[] }[] = [
  { group: { en: 'Getting started', fr: 'Premiers pas' }, slugs: ['introduction', 'quickstart', 'cdn'] },
  {
    group: { en: 'Reactivity', fr: 'Réactivité' },
    slugs: ['signals', 'derived-values', 'effects', 'stores', 'async', 'tc39-signals'],
  },
  {
    group: { en: 'Components', fr: 'Composants' },
    slugs: ['components', 'control-flow', 'lifecycle', 'context', 'web-components', 'component-resolution', 'load-strategies'],
  },
  {
    group: { en: 'Templates', fr: 'Templates' },
    slugs: ['html-templates', 'directives'],
  },
  {
    group: { en: 'Data', fr: 'Données' },
    slugs: ['caching', 'storage', 'app-storage'],
  },
  {
    group: { en: 'Authentication', fr: 'Authentification' },
    slugs: ['authentication', 'session', 'oauth2', 'better-auth', 'service-to-service', 'token-verification'],
  },
  {
    group: { en: 'Building with Fluixi', fr: 'Construire avec Fluixi' },
    slugs: ['routing', 'server-functions', 'api-routes', 'api-contracts', 'openapi', 'middleware', 'app-modules', 'environment', 'seo', 'styling', 'theming', 'images', 'static-generation', 'deployment', 'dependency-injection', 'i18n', 'compiler'],
  },
];

/** Flat reading order across all groups (for prev/next). */
export const ORDER: string[] = NAV.flatMap((s) => s.slugs);

const navs = new Map<string, { group: Record<Lang, string>; slugs: string[] }[]>();

/**
 * The sidebar of one version in one language: the pages it has, in NAV's order. The same array
 * every time, so a navigation within a version keeps the sidebar's elements, and its scroll.
 */
export function navOf(version: string, lang: Lang): { group: Record<Lang, string>; slugs: string[] }[] {
  const key = `${version}/${lang}`;
  let nav = navs.get(key);
  if (!nav) {
    nav = NAV.map((g) => ({ ...g, slugs: g.slugs.filter((s) => has(version, lang, s)) })).filter((g) => g.slugs.length > 0);
    navs.set(key, nav);
  }
  return nav;
}

/** The reading order of one version in one language, for prev and next. */
export function orderOf(version: string, lang: Lang): string[] {
  return ORDER.filter((s) => has(version, lang, s));
}

export const RELEASES_URL = 'https://github.com/fluixi/core/releases';

/**
 * Where each version takes a reader: the same page in that version, or its introduction when
 * that version has no such page. Newest first; the first is the latest.
 */
export function versionTargets(lang: Lang, slug: string): { version: string; href: string }[] {
  return VERSIONS.map((v) => ({ version: v, href: `/${v}/${lang}/${has(v, lang, slug) ? slug : DEFAULT_SLUG}` }));
}

export const UI: Record<Lang, { product: string; tagline: string; onThisPage: string; prev: string; next: string; version: string; language: string; home: string; playground: string; theme: string; skip: string; search: string; released: string; license: string; menu: string; top: string; more: string; appearance: string; releaseNotes: string; latest: string }> = {
  en: { product: 'Fluixi Docs', tagline: 'Reactivity, compiled.', onThisPage: 'On this page', prev: 'Previous', next: 'Next', version: 'Version', language: 'Language', home: 'Home', playground: 'Playground', theme: 'Switch theme', skip: 'Skip to content', search: 'Search docs', released: 'Released under the', license: 'MIT License', menu: 'Menu', top: 'Back to top', more: 'More', appearance: 'Appearance', releaseNotes: 'Release notes', latest: 'latest' },
  fr: { product: 'Docs Fluixi', tagline: 'La réactivité, compilée.', onThisPage: 'Sur cette page', prev: 'Précédent', next: 'Suivant', version: 'Version', language: 'Langue', home: 'Accueil', playground: 'Playground', theme: 'Changer de thème', skip: 'Aller au contenu', search: 'Rechercher', released: 'Publié sous', license: 'licence MIT', menu: 'Menu', top: 'Haut de page', more: 'Plus', appearance: 'Apparence', releaseNotes: 'Notes de version', latest: 'dernière' },
};

/**
 * What the version picker shows for a docs line.
 *
 * The path segment stays `v1`, URLs are permanent, but "v1" alone does not say which
 * build the page describes. The line matching the framework actually installed here is
 * labelled with its exact version, so a reader on an alpha can tell which one they are
 * reading. Older lines keep the bare segment, since this build knows nothing about them.
 */
export function versionLabel(version: string): string {
  const major = version.replace(/^v/, '');
  return VERSION.startsWith(`${major}.`) ? `${version} · ${VERSION}` : version;
}

export const LANG_LABEL: Record<Lang, string> = { en: 'English', fr: 'Français' };

export const DEFAULT_VERSION = 'v1';
export const DEFAULT_LANG: Lang = 'en';
export const DEFAULT_SLUG = 'introduction';
