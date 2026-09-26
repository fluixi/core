/**
 * @fluixi/head: built-in, reactive, SSR-first SEO & document-head management.
 *
 *   import { seo, jsonld } from '@fluixi/head';
 *   seo({ title: 'Home', description: '…', canonical: 'https://site.com/' });
 *   seo({ jsonLd: jsonld.website({ name: 'Site', url: 'https://site.com', searchUrl: '…?q=' }) });
 *
 * Static, async, or reactive (signals update the document live). SSR renders into <head>; the
 * client reconciler reuses those tags by key (no hydration mismatch) and updates on signal change.
 */
export type {
  HeadInput,
  HeadTag,
  HeadSource,
  Reactive,
  OpenGraph,
  OGImage,
  TwitterCard,
  RobotsMeta,
  AlternateLink,
  IconInput,
  MetaTag,
  LinkTag,
  ScriptTag,
} from './types.js';

export {
  createHead,
  setActiveHead,
  getActiveHead,
  setHeadScope,
  runWithHead,
  useHead,
  seo,
  resolveHead,
  type HeadRegistry,
  type ResolvedHead,
} from './core.js';

export { renderHead, renderHtmlAttrs, MANAGED_ATTR, KEY_ATTR, type SerializedHead } from './serialize.js';
export { encodeHeadMarker, extractHeadMarker, stripHeadMarker } from './transport.js';
export { mountHead } from './reconcile.js';
export { jsonld } from './jsonld.js';
export * as components from './components.js';
export { Title, Meta, Link, Script, Base, JsonLD } from './components.js';
export {
  generateSitemap,
  generateSitemapIndex,
  chunkSitemap,
  generateRobots,
  type SitemapEntry,
  type SitemapImage,
  type SitemapVideo,
  type RobotsRule,
  type RobotsOptions,
} from './sitemap.js';
