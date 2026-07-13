// Sidebar structure (ordered) + UI strings per language. Page titles come from each markdown's
// H1 (see content.ts); group labels and chrome are translated here.
import type { Lang } from './content.js';

export const NAV: { group: Record<Lang, string>; slugs: string[] }[] = [
  { group: { en: 'Getting started', fr: 'Premiers pas' }, slugs: ['introduction', 'quickstart'] },
  {
    group: { en: 'Reactivity', fr: 'Réactivité' },
    slugs: ['signals', 'derived-values', 'effects', 'stores', 'async', 'tc39-signals'],
  },
  {
    group: { en: 'Components', fr: 'Composants' },
    slugs: ['components', 'control-flow', 'lifecycle'],
  },
  {
    group: { en: 'Templates', fr: 'Templates' },
    slugs: ['html-templates', 'directives'],
  },
  {
    group: { en: 'Building with Fluixi', fr: 'Construire avec Fluixi' },
    slugs: ['routing', 'server-functions', 'api-routes', 'middleware', 'static-generation', 'dependency-injection', 'i18n'],
  },
];

/** Flat reading order across all groups (for prev/next). */
export const ORDER: string[] = NAV.flatMap((s) => s.slugs);

export const UI: Record<Lang, { product: string; tagline: string; onThisPage: string; prev: string; next: string; version: string; language: string; home: string; playground: string }> = {
  en: { product: 'Fluixi Docs', tagline: 'Reactivity, compiled.', onThisPage: 'On this page', prev: 'Previous', next: 'Next', version: 'Version', language: 'Language', home: 'Home', playground: 'Playground' },
  fr: { product: 'Docs Fluixi', tagline: 'La réactivité, compilée.', onThisPage: 'Sur cette page', prev: 'Précédent', next: 'Suivant', version: 'Version', language: 'Langue', home: 'Accueil', playground: 'Bac à sable' },
};

export const LANG_LABEL: Record<Lang, string> = { en: 'English', fr: 'Français' };

export const DEFAULT_VERSION = 'v1';
export const DEFAULT_LANG: Lang = 'en';
export const DEFAULT_SLUG = 'introduction';
