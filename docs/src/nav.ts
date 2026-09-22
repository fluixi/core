// Sidebar structure (ordered) + UI strings per language. Page titles come from each markdown's
// H1 (see content.ts); group labels and chrome are translated here.
import { VERSION } from '@fluixi/core';
import type { Lang } from './content.js';

export const NAV: { group: Record<Lang, string>; slugs: string[] }[] = [
  { group: { en: 'Getting started', fr: 'Premiers pas' }, slugs: ['introduction', 'quickstart', 'cdn'] },
  {
    group: { en: 'Reactivity', fr: 'Réactivité' },
    slugs: ['signals', 'derived-values', 'effects', 'stores', 'async', 'tc39-signals'],
  },
  {
    group: { en: 'Components', fr: 'Composants' },
    slugs: ['components', 'control-flow', 'lifecycle', 'component-resolution', 'load-strategies'],
  },
  {
    group: { en: 'Templates', fr: 'Templates' },
    slugs: ['html-templates', 'directives'],
  },
  {
    group: { en: 'Authentication', fr: 'Authentification' },
    slugs: ['authentication', 'session', 'oauth2', 'better-auth', 'service-to-service', 'token-verification'],
  },
  {
    group: { en: 'Building with Fluixi', fr: 'Construire avec Fluixi' },
    slugs: ['routing', 'server-functions', 'api-routes', 'middleware', 'seo', 'images', 'static-generation', 'deployment', 'dependency-injection', 'i18n', 'compiler'],
  },
];

/** Flat reading order across all groups (for prev/next). */
export const ORDER: string[] = NAV.flatMap((s) => s.slugs);

export const UI: Record<Lang, { product: string; tagline: string; onThisPage: string; prev: string; next: string; version: string; language: string; home: string; playground: string; theme: string; skip: string; search: string }> = {
  en: { product: 'Fluixi Docs', tagline: 'Reactivity, compiled.', onThisPage: 'On this page', prev: 'Previous', next: 'Next', version: 'Version', language: 'Language', home: 'Home', playground: 'Playground', theme: 'Switch theme', skip: 'Skip to content', search: 'Search docs' },
  fr: { product: 'Docs Fluixi', tagline: 'La réactivité, compilée.', onThisPage: 'Sur cette page', prev: 'Précédent', next: 'Suivant', version: 'Version', language: 'Langue', home: 'Accueil', playground: 'Bac à sable', theme: 'Changer de thème', skip: 'Aller au contenu', search: 'Rechercher' },
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
