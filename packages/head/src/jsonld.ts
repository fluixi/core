/**
 * Typed schema.org JSON-LD builders. Each returns a plain object ready for `seo({ jsonLd })` or
 * `<JsonLD data={…} />`. Pass-through extra fields are allowed; `custom()` builds an arbitrary type.
 */
const CTX = 'https://schema.org' as const;
type Obj = Record<string, unknown>;
const clean = (o: Obj): Obj => {
  const out: Obj = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
};

export const custom = (type: string, data: Obj = {}): Obj => clean({ '@context': CTX, '@type': type, ...data });

export const organization = (d: { name: string; url?: string; logo?: string; sameAs?: string[] } & Obj): Obj =>
  custom('Organization', d);

export const person = (d: { name: string; url?: string; image?: string; jobTitle?: string; sameAs?: string[] } & Obj): Obj =>
  custom('Person', d);

export const website = (d: { name: string; url: string; description?: string; searchUrl?: string } & Obj): Obj => {
  const { searchUrl, ...rest } = d;
  return custom('WebSite', {
    ...rest,
    ...(searchUrl
      ? {
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${searchUrl}{search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        }
      : {}),
  });
};

export const webPage = (d: { name: string; url?: string; description?: string } & Obj): Obj => custom('WebPage', d);

export const searchAction = (d: { target: string; queryInput?: string }): Obj =>
  clean({ '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: d.target }, 'query-input': d.queryInput ?? 'required name=search_term_string' });

export const article = (d: { headline: string; image?: string | string[]; author?: string | Obj; datePublished?: string; dateModified?: string; description?: string } & Obj): Obj =>
  custom('Article', { ...d, author: typeof d.author === 'string' ? { '@type': 'Person', name: d.author } : d.author });

export const blogPosting = (d: Parameters<typeof article>[0]): Obj => ({ ...article(d), '@type': 'BlogPosting' });

export const faq = (items: Array<{ question: string; answer: string }>): Obj =>
  custom('FAQPage', {
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.question, acceptedAnswer: { '@type': 'Answer', text: i.answer } })),
  });

export const product = (d: { name: string; image?: string | string[]; description?: string; sku?: string; brand?: string; offers?: Obj } & Obj): Obj =>
  custom('Product', { ...d, brand: typeof d.brand === 'string' ? { '@type': 'Brand', name: d.brand } : d.brand });

export const breadcrumb = (items: Array<{ name: string; url: string }>): Obj =>
  custom('BreadcrumbList', {
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  });

export const videoObject = (d: { name: string; description?: string; thumbnailUrl?: string | string[]; uploadDate?: string; contentUrl?: string; embedUrl?: string; duration?: string } & Obj): Obj =>
  custom('VideoObject', d);

export const event = (d: { name: string; startDate: string; endDate?: string; location?: string | Obj; description?: string } & Obj): Obj =>
  custom('Event', { ...d, location: typeof d.location === 'string' ? { '@type': 'Place', name: d.location } : d.location });

export const localBusiness = (d: { name: string; address?: string | Obj; telephone?: string; url?: string; image?: string; priceRange?: string } & Obj): Obj =>
  custom('LocalBusiness', d);

export const softwareApplication = (d: { name: string; operatingSystem?: string; applicationCategory?: string; offers?: Obj; aggregateRating?: Obj } & Obj): Obj =>
  custom('SoftwareApplication', d);

export const jsonld = {
  custom,
  organization,
  person,
  website,
  webPage,
  searchAction,
  article,
  blogPosting,
  faq,
  product,
  breadcrumb,
  videoObject,
  event,
  localBusiness,
  softwareApplication,
};
