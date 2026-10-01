import type { Accessor } from '@fluixi/reactive/signal';

/** A value that may be static or a reactive accessor (signal/memo). */
export type Reactive<T> = T | Accessor<T>;

export interface OGImage {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface OpenGraph {
  title?: string;
  description?: string;
  type?: string; // website, article, book, profile, video.*, music.*
  url?: string;
  siteName?: string;
  locale?: string;
  localeAlternate?: string[];
  image?: string | OGImage | Array<string | OGImage>;
  video?: string | { url: string; type?: string; width?: number; height?: number };
  audio?: string | { url: string; type?: string };
  /** og:article:* */
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    expirationTime?: string;
    author?: string | string[];
    section?: string;
    tag?: string | string[];
  };
  /** og:book:* */
  book?: { author?: string | string[]; isbn?: string; releaseDate?: string; tag?: string | string[] };
  /** og:profile:* */
  profile?: { firstName?: string; lastName?: string; username?: string; gender?: string };
}

export interface TwitterCard {
  card?: 'summary' | 'summary_large_image' | 'player' | 'app';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  player?: string;
  playerWidth?: number;
  playerHeight?: number;
  app?: { name?: string; idIphone?: string; idIpad?: string; idGooglePlay?: string };
}

export interface RobotsMeta {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
  maxSnippet?: number;
  maxImagePreview?: 'none' | 'standard' | 'large';
  maxVideoPreview?: number;
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

export interface IconInput {
  /** favicon(s), rel="icon" */
  icon?: string | Array<{ url: string; type?: string; sizes?: string }>;
  /** apple-touch-icon */
  apple?: string | Array<{ url: string; sizes?: string }>;
  /** mask-icon (Safari pinned tab) */
  mask?: { url: string; color?: string };
  /** rel="shortcut icon" */
  shortcut?: string;
  /** msapplication-TileImage / TileColor */
  msTileImage?: string;
  msTileColor?: string;
}

export interface MetaTag {
  name?: string;
  property?: string;
  httpEquiv?: string;
  charset?: string;
  content?: string;
  [attr: string]: string | undefined;
}
export interface LinkTag {
  rel?: string;
  href?: string;
  [attr: string]: string | undefined;
}
export interface ScriptTag {
  src?: string;
  type?: string;
  /** inline body */
  children?: string;
  [attr: string]: string | undefined;
}

/** The full, typed head/SEO input. Every field accepts a reactive accessor where it makes sense. */
export interface HeadInput {
  title?: Reactive<string>;
  /** e.g. "%s · Fluixi". Inherited from layouts; applied to the most specific title. */
  titleTemplate?: string | ((title: string) => string);
  description?: Reactive<string>;
  keywords?: Reactive<string | string[]>;
  author?: string;
  robots?: string | RobotsMeta;
  canonical?: Reactive<string>;
  /** <html lang> */
  lang?: Reactive<string>;
  /**
   * Other attributes on <html>, rendered by the server and kept current on the client:
   * `{ 'data-theme': () => theme() }`. A later source wins per attribute, as for `lang`.
   */
  htmlAttrs?: Record<string, Reactive<string>>;
  themeColor?: Reactive<string>;
  viewport?: string;
  charset?: string;
  generator?: string;
  applicationName?: string;
  referrer?: string;
  colorScheme?: string;
  manifest?: string;

  og?: OpenGraph;
  twitter?: TwitterCard;

  /** Structured data: one object or many. Emitted as <script type="application/ld+json">. */
  jsonLd?: Reactive<object | object[]>;

  /** hreflang alternates. */
  alternates?: AlternateLink[];
  /** RSS/Atom feeds → <link rel="alternate" type="application/rss+xml">. */
  feeds?: Array<{ href: string; title?: string; type?: string }>;

  icons?: IconInput;
  verification?: { google?: string; bing?: string; yandex?: string; pinterest?: string; [k: string]: string | undefined };

  base?: string;

  /** Escape hatches: anything not first-classed above. */
  meta?: MetaTag[];
  link?: LinkTag[];
  script?: ScriptTag[];
}

/** A normalized, deduplicated head tag (the resolver's output). */
export type HeadTag =
  | { tag: 'title'; key: 'title'; children: string }
  | { tag: 'meta'; key: string; attrs: Record<string, string> }
  | { tag: 'link'; key: string; attrs: Record<string, string> }
  | { tag: 'base'; key: 'base'; attrs: Record<string, string> }
  | { tag: 'script'; key: string; attrs: Record<string, string>; children?: string }
  | { tag: 'htmlAttr'; key: string; name: string; value: string };

export type HeadSource = HeadInput | (() => HeadInput);
