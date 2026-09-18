/**
 * SSR resource injectables: graph-agnostic module state. The server (@fluixi/server
 * via @fluixi/dom) injects these so async SSR can await in-flight resource fetches and
 * seed resources from server-serialized data on the client. All no-ops when unset -> * zero client/runtime impact. Used by both the TC39 resource core and the legacy graph,
 * so they live in a TC39-owned module (not signal.ts, which is being retired).
 */

let _resourceTracker: ((p: Promise<any>) => void) | null = null;
/** Register a sink that receives every resource fetch promise (server: collect & await). */
export function setResourceTracker(fn: ((p: Promise<any>) => void) | null): void {
  _resourceTracker = fn;
}
/** @internal: resources report their fetch promise here. */
export function trackResourcePromise(p: Promise<any>): void {
  if (_resourceTracker) _resourceTracker(p);
}

let _serverDataGetter: ((id: string) => { value: any } | undefined) | null = null;
/** Inject server-serialized resource data (client hydration: seed without refetch). */
export function setServerDataGetter(fn: ((id: string) => { value: any } | undefined) | null): void {
  _serverDataGetter = fn;
}
/** @internal: resources look up seeded data by their SSR id. */
export function getServerData(id: string): { value: any } | undefined {
  return _serverDataGetter ? _serverDataGetter(id) : undefined;
}

let _resourceIdSource: (() => string) | null = null;
/** Inject a stable per-resource id source (server render order / hydration order). */
export function setResourceIdSource(fn: (() => string) | null): void {
  _resourceIdSource = fn;
}
/** @internal, a resource asks for its SSR id at creation; undefined on a plain client. */
export function nextResourceId(): string | undefined {
  return _resourceIdSource ? _resourceIdSource() : undefined;
}

let _resourceDataSink: ((id: string, value: any) => void) | null = null;
/** Inject a sink for resolved resource values (server: collect for serialization). */
export function setResourceDataSink(fn: ((id: string, value: any) => void) | null): void {
  _resourceDataSink = fn;
}
/** @internal, a resource reports its resolved value here. */
export function reportResourceData(id: string, value: any): void {
  if (_resourceDataSink) _resourceDataSink(id, value);
}
