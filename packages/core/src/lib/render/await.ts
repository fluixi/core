/**
 * `<Await value=${promise}>` — resolve a promise and render its value.
 *
 * A thin, Suspense-free helper for the common "await one promise" case:
 *
 *   <Await value=${fetchUser(id)} fallback=${html`<p>loading…</p>`}>
 *     ${(user) => html`<span>${user.name}</span>`}
 *   </Await>
 *
 * `value` is a promise (or a function returning one). While pending it renders
 * `fallback`; once resolved it calls the render-prop child with the value. The
 * resource read is guarded by `.loading`, so it never throws/suspends.
 */
import { createResource } from '@fluixi/reactive/signal';

export interface AwaitProps<T> {
  value: Promise<T> | (() => Promise<T>);
  fallback?: unknown;
  /** Render prop called with the resolved value (or plain children). */
  children?: ((value: T) => unknown) | unknown;
}

export function Await<T>(props: AwaitProps<T>): () => unknown {
  const fetcher = (): Promise<T> => {
    const v = props.value;
    return typeof v === 'function' ? (v as () => Promise<T>)() : v;
  };
  const [data] = createResource<T>(fetcher);
  return () => {
    if (data.loading) return (props as AwaitProps<T>).fallback;
    const child = (props as AwaitProps<T>).children;
    return typeof child === 'function' ? (child as (value: T) => unknown)(data() as T) : child;
  };
}
