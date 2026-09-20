/**
 * Declarative head components. They render nothing, each registers metadata via useHead() and
 * returns null, so they compose anywhere in the tree and work identically on the server and client
 * (a signal passed to one updates the document live). Usage:
 *
 *   <Title>{() => `${page()} · Fluixi`}</Title>
 *   <Meta name="description" content={desc} />
 *   <Link rel="canonical" href={url} />
 *   <JsonLD data={jsonld.article({ headline: title() })} />
 */
import { useHead } from './core.js';
import type { Reactive } from './types.js';

function read<T>(v: Reactive<T> | undefined): T | undefined {
  return typeof v === 'function' ? (v as () => T)() : v;
}

export function Title(props: { children?: Reactive<string> }): null {
  useHead(() => ({ title: read(props.children) }));
  return null;
}

export function Meta(props: { name?: string; property?: string; httpEquiv?: string; charset?: string; content?: Reactive<string> }): null {
  useHead(() => ({ meta: [{ ...props, content: read(props.content) }] }));
  return null;
}

export function Link(props: Record<string, Reactive<string> | undefined>): null {
  useHead(() => {
    const l: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(props)) l[k] = read(v);
    return { link: [l] };
  });
  return null;
}

export function Script(props: { src?: string; type?: string; children?: Reactive<string>; [k: string]: unknown }): null {
  useHead(() => {
    const s: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(props)) s[k] = read(v as Reactive<string>);
    return { script: [s as { src?: string }] };
  });
  return null;
}

export function Base(props: { href: string; target?: string }): null {
  useHead({ base: props.href });
  return null;
}

export function JsonLD(props: { data: Reactive<object | object[]> }): null {
  useHead(() => ({ jsonLd: read(props.data) }));
  return null;
}
