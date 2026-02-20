# KettleJS Framework Audit Report
## SolidJS Core Semantics & SolidStart Architecture Alignment

---

## Task 1: Reactive Core Audit

### 1.1 Signal Implementation (`packages/reactive/src/lib/signal/signal.ts`)

**Architecture:** The reactive core follows SolidJS's general topology: `Owner/Listener` globals, `Computation` nodes, `CLEAN/STALE/DIRTY` state flags, and a `signalObservers` WeakMap for dependency tracking.

#### Semantic Deviations from SolidJS

**CRITICAL: Dependency tracking uses Set conversion on every read (signal.ts:322-330)**
```
const sources = new Set(observer.sources);
if (!observer.sources) {
  sources.add(s);
} else if (!sources.has(s)) {
  sources.add(s);
}
observer.sources = Array.from(sources);
```
Every signal read allocates a new Set, copies the array into it, checks membership, then converts back to an array. SolidJS uses a slot-based linked-list approach with O(1) subscription. This is O(n) per read and creates massive GC pressure. The `sourceSlots` field exists on `Computation` but is never used.

**CRITICAL: Memo eagerly computes on creation (signal.ts:749-767)**
SolidJS memos are lazy — they compute only when first read. Your memos compute immediately at creation time (lines 749-767), then re-compute on read if dirty. This means memos created inside conditional branches that are never read still execute their computation function, breaking the lazy evaluation invariant.

**CRITICAL: Propagation runs effects during memo evaluation (signal.ts:670-724)**
When a memo recomputes and its value changes, it immediately propagates and runs downstream effects synchronously within the same evaluation pass. SolidJS collects updates and flushes them in topological order. Your approach can cause glitches where effects see partially-updated state.

**DEVIATION: `createRenderEffect` is identical to `createEffect` (signal.ts:2244-2250)**
In SolidJS, `createRenderEffect` runs synchronously during the render phase (before DOM commit), while `createEffect` is deferred to after DOM commit. Your implementation aliases them, which means render-time effects have no priority distinction from user effects.

**DEVIATION: No topological sorting of updates**
SolidJS processes computations in topological dependency order to prevent glitches. Your `flushUpdates` processes the `Updates` array in insertion order (signal.ts:818-825), which means downstream computations may run before their upstream dependencies have been updated.

**DEVIATION: Ownership cleanup during `runComputation` doesn't dispose owned nodes**
When a computation re-runs, SolidJS disposes all previously owned computations (nested effects/memos created during the previous execution). Your `runComputation` (signal.ts:477-530) clears `c.sources` but never disposes `c.owned`, leading to memory leaks as stale nested computations accumulate.

**DEVIATION: MAX_ITERATIONS counter is global and never reset properly**
`ExecCount` increments on every computation run but is only reset in `flushUpdates` (signal.ts:810). If computations run outside of batch (the normal path), `ExecCount` accumulates across all signal writes and will eventually hit `MAX_ITERATIONS` even without infinite loops.

### 1.2 Missing Invariants

| SolidJS Invariant | Status |
|---|---|
| Signals are identity-stable (same [get,set] tuple) | OK |
| Effects defer to after render | MISSING (no separation) |
| Memos are lazy (compute on first read) | BROKEN (eager on creation) |
| Topological update ordering | MISSING |
| Owned computation disposal on re-run | MISSING |
| Slot-based O(1) dependency tracking | MISSING (O(n) Set copies) |
| Batch collects all updates, flushes once | OK (partial — memo propagation bypasses) |
| `untrack` prevents tracking | OK |
| `createRoot` provides disposal boundary | OK |
| Context walks owner chain | OK |

---

## Task 2: Suspense Integration Audit

### 2.1 Suspense Architecture

**Suspense lives in two places:** `signal.ts` (reactive-level `SuspenseState`, `trackPromise`, `runSuspense`) and `kettlejs/render/suspense.ts` (component-level `SuspenseImpl`).

#### Deviations

**CRITICAL: Suspense is not at the signal execution level**
In SolidJS, Suspense is deeply integrated into the reactive graph — `createResource` throws promises that are caught by the Suspense boundary via the reactive runtime. Your `SuspenseImpl` (suspense.ts:172-386) manually scans for promises by iterating children, using `scanForPromises`, catching thrown promises, and setting loading state via signals. This is a React-style approach bolted onto a Solid-style runtime.

**CRITICAL: `createResource` throws promises but nobody catches them properly**
`createResource` (signal.ts:1192-1207) throws the promise when state is `'pending'`:
```
if (s === 'pending') throw p;
```
But the memo/effect system's `runComputation` (signal.ts:520-523) silently swallows thrown promises:
```
if (isPromise(err)) {
  return;
}
```
This means the resource's thrown promise is never propagated to any Suspense boundary through the reactive graph. The Suspense component must independently discover async state via manual promise scanning.

**DEVIATION: `setSuspenseContext` / `runSuspense` coupling**
The `setSuspenseContext` function (signal.ts:2301-2325) adds the children (`props.suspense`) to the resources Set on creation, even though children aren't a Promise. The suspense state is cached in a WeakMap keyed by the children value, which means if children change, the suspense state is orphaned.

**DEVIATION: `trackPromise` uses `promise.finally()` for cleanup (signal.ts:2478)**
`finally` doesn't provide the resolved value, so when a resource's promise resolves, the Suspense boundary decrements the counter but has no way to know what value was produced. The loading/content state relies entirely on the resource's internal signals rather than the Suspense boundary's tracking.

**DEVIATION: No nested Suspense boundary propagation**
The `parent` field exists on `SuspenseState` but is never used for propagation. If a child Suspense boundary doesn't catch a thrown promise, it should bubble to the parent. This doesn't happen.

### 2.2 Context Propagation Through Suspense

Context propagation (`useContext` in signal.ts:1599-1613) walks the Owner chain. Since Suspense doesn't create its own ownership boundary in a special way, context should propagate. However, the component-level Suspense runs children with `untrack(() => resolveChildrenOnce())` (suspense.ts:370), which may break ownership chain if children create effects that need the Suspense owner.

---

## Task 3: createResource Audit

### 3.1 Implementation (signal.ts:1088-1228)

**Architecture:** `createResource` creates internal signals for `value`, `error`, `state`, and `promise`. A `createEffect` watches the source and triggers the fetcher. The resource accessor checks state and either returns the value or throws the promise/error.

#### Correct behaviors:
- Source reactivity: Re-fetches when source signal changes
- Cancellation: Uses `onCleanup` to set cancelled flag
- State tracking: `loading`, `error`, `state`, `latest` properties
- Batch usage: State transitions are batched

#### Deviations

**CRITICAL: Resource throws promise inside accessor, but memo catches and silences it**
When `createResource` is used inside `createMemo`, the memo's `try/catch` (signal.ts:730-733) catches the thrown promise and calls `handleError`, which re-throws. But the memo initialization (signal.ts:753-763) also catches errors. If the resource is pending during memo creation, the memo's initial value will be `undefined` and the promise is lost.

**CRITICAL: No Suspense-aware tracking path in the resource accessor**
The resource accessor (signal.ts:1192-1207) checks `getSuspenseContext()` and calls `trackPromise`, but this only works if the accessor is called during a `runSuspense` block. Since components are wrapped in `untrack`, the Suspense context (`currentSuspense`) may be null when the resource accessor runs.

**DEVIATION: `createResource` called inside `createMemo` in router (router.ts:258)**
The Routes component does:
```
const data = createMemo(() => {
  return match.defs.map((def) => {
    const [data] = createResource(() => def.data({...}));
    return data;
  });
});
```
Every time `routeMatch` changes, the memo re-runs and creates **new** resources. The old resources are never disposed because memo re-runs don't dispose owned computations (see Task 1). This is a resource leak.

**DEVIATION: Argument normalization is fragile (signal.ts:1097-1104)**
The 1-arg and 2-arg forms use `arguments.length` and type checks that can be confused when the fetcher returns an object. SolidJS uses a more robust signature detection.

### 3.2 SSR Integration

`createResource` has no SSR-specific code. It doesn't check `isServerEnvironment()`, doesn't serialize resolved values into the hydration stream, and doesn't skip fetching during hydration. The `cache()` function in `data.ts` checks hydration data, but `createResource` itself doesn't.

---

## Task 4: Renderer-Agnostic Validation

### 4.1 Claim: Both renderers (JSX + Lit) use same runtime primitives

**PARTIALLY TRUE with significant caveats.**

#### What is shared:
- Both use `createSignal`, `createEffect`, `createMemo` from `@awc/reactive`
- Both use `insert()` from `@awc/dom/runtime.ts` for DOM insertion
- Both use the same context system via `createContext`/`useContext`

#### Where they diverge:

**JSX Runtime (`jsx-runtime.ts`) creates real DOM nodes directly:**
```
function createNativeElement(tag: string, props: any): Node {
  const element = document.createElement(tag);
  applyProps(element, props, isSVG);
  return element;
}
```
This bypasses `@awc/dom`'s `insert()` for element creation. Only children insertion goes through the shared runtime.

**Lit Runtime uses `lit-html`'s template system:**
The DOM runtime (`runtime.ts`) has `renderLitToNodes()` which renders Lit templates into a temporary container and extracts DOM nodes. This is a completely different code path from JSX's `document.createElement`.

**SSR is broken for JSX:**
`jsx-runtime.ts` calls `document.createElement` directly. On the server, `document` doesn't exist. The server renderer (`server-renderer.ts:22-96`) handles Lit templates by stringifying them but has no path for JSX-created DOM nodes.

**Integration layer is brittle:**
`integration.ts` uses `globalThis.__createEffect`, `globalThis.__batch`, etc., registered at init time. If the JSX runtime imports `@awc/dom` before integration is initialized, all effects fall back to single-execution mode (integration.ts:54-68). The `autoInitialize` function uses `require()` (CJS) in what appears to be an ESM project.

### 4.2 Proof Points

| Primitive | JSX Path | Lit Path | Same? |
|---|---|---|---|
| Signal read in template | `createRenderEffect` in applyProps | Lit directive (external) | NO |
| Element creation | `document.createElement` | `html` tagged template | NO |
| Children insertion | `insert()` | `insert()` | YES |
| Component execution | `untrack(() => Comp(props))` | `untrack(() => Comp(props))` | YES |
| Event binding | `addEventListener` in `createRenderEffect` | Lit `@event` syntax | NO |
| Attribute setting | `setAttribute()` from `@awc/dom` | Lit binding | NO |
| Context | Same `createContext/useContext` | Same | YES |
| Suspense | Same `Suspense` component | Same | YES |

**Conclusion:** The renderers share reactive primitives and context/Suspense components, but the actual DOM creation and binding mechanisms are completely different. This is not renderer-agnostic in the SolidJS sense (where JSX compiles to the same `insert`/`template`/`effect` calls). It's more like two separate renderers that happen to use the same signal library.

---

## Task 5: SSR Audit

### 5.1 Server Rendering (`server/index.ts`, `dom/server-renderer.ts`)

**CRITICAL: `renderToStream` is not actually streaming (server-renderer.ts:60-78)**
```
const iterator = (async function* () {
  const content = typeof app === 'function' ? app() : app;
  const html = await renderNode(content);
  yield html; // Single yield
})();
```
The entire app is rendered to a string in one shot, then yielded once. There is no incremental flushing, no Suspense boundary streaming, and no out-of-order completion.

**CRITICAL: No resource collection during SSR**
SolidStart collects all pending resources during server rendering, waits for them, serializes their values, and injects them into the HTML stream. Your SSR (`server/index.ts:68-96`) appends `serializeHydrationData()` but only includes data explicitly registered via `setHydrationData()`. `createResource` never calls `setHydrationData`, so resource data is lost between server and client.

**CRITICAL: Hydration markers lack unique IDs (hydration.ts:254-276)**
```
export function hydrationMarker(id: string): string {
  return `<!--#-->`; // id parameter is ignored!
}
```
The `generateMarkerID()` function exists and produces unique IDs, but the marker functions ignore them entirely. This means hydration cannot match server-rendered boundaries to client components.

**DEVIATION: server-renderer.ts doesn't handle JSX elements**
`renderNode` handles strings, numbers, functions, arrays, Promises, and objects with `_$litType$`. But JSX creates actual DOM Nodes (via `document.createElement`), which don't exist on the server. There's no handling for this case.

**DEVIATION: renderToString in server/index.ts wraps in SSRContext but SSRContext is never read**
```
return SSRContext.Provider({ value: ctx, children: result });
```
The `SSRContext` is created but `useContext(SSRContext)` is never called anywhere in the codebase. The context value includes `url`, `requestId`, and `nonce` but these are unused.

### 5.2 Hydration

**DEVIATION: Auto-cleanup on page load with 100ms setTimeout (hydration.ts:423-428)**
```
window.addEventListener('load', () => {
  setTimeout(cleanupHydration, 100);
});
```
This runs unconditionally in any browser environment, even if the app never used SSR. The 100ms timeout is a race condition — if hydration takes longer, cleanup destroys data before hydration consumes it.

**DEVIATION: `deserializeHydrationData` is never called automatically**
Client-side hydration data loading requires manually calling `deserializeHydrationData()`, but there's no code path that does this. The `hydrate()` function in `runtime.ts` doesn't call it either.

---

## Task 6: Routing Audit

### 6.1 Router Architecture (`router/router.ts`)

**CRITICAL: Routes passes async function to createMemo (router.ts:277-358)**
```
const run = async () => { ... };
return createMemo(run);
```
`createMemo` expects a synchronous computation. An async function returns a Promise, so the memo's value becomes a Promise. The memo's dependency tracking only captures signals read synchronously before the first `await`. Any signal reads after `await` are not tracked.

**CRITICAL: createResource inside createMemo creates resource leaks (router.ts:248-273)**
Each time `routeMatch` changes:
1. The `data` memo re-runs
2. New `createResource` calls create new effects and signals
3. The old resources' effects are never disposed (no ownership cleanup on memo re-run — see Task 1)
4. Old resource effects continue fetching and updating stale signals

**DEVIATION: No route-based Suspense integration**
Routes don't create Suspense boundaries for data loading. The `data` function creates resources but doesn't wrap them in Suspense. When a route's data is loading, there's no fallback — the component renders with `undefined` data.

**DEVIATION: Location tracking uses Proxy instead of signals**
```
const locationProxy = new Proxy({} as Location, {
  get(_, prop) {
    const l = loc();
    if (prop === 'query') return parseQuery(l.search);
    return l[prop as keyof typeof l];
  },
});
```
This calls `loc()` (signal read) on every property access, which is correct for dependency tracking. However, the Proxy returns a new `parseQuery` result on every `query` access, creating a new object each time. If a memo depends on `location.query`, it will re-run on every navigation even if the query didn't change.

**DEVIATION: Nested route layouts don't work with Suspense**
The Routes component builds content bottom-up (router.ts:286-332), wrapping each route in `RouteContext.Provider` and `RouteDataProvider`. But there's no Suspense boundary per route level, so a loading child route blocks the entire route tree.

### 6.2 Data Loading (`router/data.ts`)

**DEVIATION: `cache()` deduplication uses JSON.stringify keys**
```
const key = name + ':' + JSON.stringify(args);
```
This breaks for arguments containing circular references, functions, or Symbols. SolidStart uses a more sophisticated key generation.

**DEVIATION: `revalidate()` clears cache but doesn't trigger refetch**
```
export function revalidate(key: string) {
  for (const k of globalCache.keys()) {
    if (predicate(k)) globalCache.delete(k);
  }
  // TODO: Trigger resource refresh
}
```
The TODO says it all — cache invalidation doesn't actually cause resources to refetch.

**DEVIATION: `createAsync` is a thin wrapper that loses error/loading state**
```
export function createAsync<T, S = true>(
  fetcher: (source: S) => Promise<T> | T,
  source?: () => S
): Accessor<T | undefined> {
  const [data] = createResource(source || (() => true as S), fetcher);
  return data;
}
```
It returns only the accessor, discarding `mutate` and `refetch`. This makes `createAsync` resources un-refreshable and un-mutable.

---

## Task 7: Maintainer Report

### Priority: MUST FIX (Broken invariants that cause bugs)

1. **Dependency tracking allocates Set on every signal read** (signal.ts:322-330)
   - Impact: O(n) per signal read, massive GC pressure, performance degradation with graph size
   - Fix: Implement slot-based tracking like SolidJS (linked list of source/observer slots)

2. **Memo re-runs don't dispose owned computations** (signal.ts:477-530, 635-737)
   - Impact: Memory leak — every memo/effect re-run accumulates stale nested computations
   - Fix: In `runComputation`, before re-executing, dispose all `c.owned` children

3. **createResource inside createMemo in router causes resource leaks** (router.ts:248-273)
   - Impact: Each navigation creates new resources without disposing old ones
   - Fix: Restructure to create resources outside memos, or fix ownership disposal (item 2)

4. **Routes passes async function to createMemo** (router.ts:277-358)
   - Impact: Memo value is a Promise, dependency tracking broken after first await
   - Fix: Use sync memo for route matching, handle async data loading separately via createResource

5. **Thrown promises silently swallowed in runComputation** (signal.ts:520-523)
   - Impact: Suspense can never catch resource loading state through the reactive graph
   - Fix: Detect thrown promises and propagate to current Suspense boundary via `trackPromise`

6. **Hydration markers ignore ID parameter** (hydration.ts:254-276)
   - Impact: Hydration cannot match server boundaries to client components
   - Fix: Include the ID in marker output: `<!--h:${id}-->`

7. **renderToStream is not streaming** (server-renderer.ts:60-78)
   - Impact: No progressive rendering, defeats purpose of streaming SSR
   - Fix: Implement flush-per-Suspense-boundary streaming with out-of-order completion

8. **JSX runtime calls document.createElement directly** (jsx-runtime.ts:174-184)
   - Impact: JSX rendering is broken on server (no `document`)
   - Fix: Add server-side rendering path for JSX elements, or compile JSX to template strings on server

### Priority: SHOULD FIX (Semantic deviations that affect correctness)

9. **Memos eagerly compute on creation** (signal.ts:749-767)
   - Impact: Unnecessary computation when memos in conditional branches are never read
   - Fix: Remove the initialization block; compute lazily on first read only

10. **No topological ordering of update flushes** (signal.ts:818-825)
    - Impact: Glitches where effects see partially-updated reactive graph
    - Fix: Sort `Updates` array by depth in ownership tree before flushing

11. **createRenderEffect === createEffect** (signal.ts:2244-2250)
    - Impact: No render-phase vs user-effect priority distinction
    - Fix: Implement separate scheduling queues for render effects (sync) vs user effects (deferred)

12. **Context `useContext` in kettlejs caches in WeakMap** (context.ts:623-652)
    - Impact: If a Provider's value changes, `useContext` returns stale cached value
    - Fix: Remove WeakMap caching; rely on Owner chain walk for fresh values

13. **Event listeners in JSX never cleaned up** (jsx-runtime.ts:209-219)
    - Impact: Each `createRenderEffect` re-run adds new listener without removing old one
    - Fix: Track previous listener and remove before adding new one

14. **Auto-cleanup hydration on page load with 100ms setTimeout** (hydration.ts:423-428)
    - Impact: Race condition; cleanup may run before hydration completes
    - Fix: Make cleanup explicit, called after hydration is confirmed complete

15. **`revalidate()` doesn't trigger resource refresh** (data.ts:116-126)
    - Impact: Cache invalidation has no effect on rendered data
    - Fix: Maintain a registry of active resources per cache key; trigger refetch on invalidation

### Priority: NICE TO HAVE (Non-blocking improvements)

16. **MAX_ITERATIONS counter accumulates globally** (signal.ts:497-503)
    - Fix: Reset ExecCount at the start of each batch or signal write

17. **Integration layer uses `require()` in ESM context** (integration.ts)
    - Fix: Use dynamic `import()` or build-time resolution

18. **splitProps doesn't create reactive proxies** (jsx-runtime.ts:555-584)
    - Fix: Use Object.defineProperty with getters for reactive prop forwarding

19. **Location.query creates new object on every access** (router.ts:143)
    - Fix: Memoize query parsing with a separate signal

20. **`cache()` uses JSON.stringify for keys** (data.ts:68)
    - Fix: Use a stable serialization that handles non-JSON-safe values

21. **console.log statements throughout production code**
    - Files: router.ts (lines 275, 284, 301), suspense.ts (lines 200, 266, 273-283), component.ts (line 298, 846), signal.ts (lines 524, 762, 2479), context.ts (lines 510, 639, 645, 1592)
    - Fix: Remove or gate behind `__DEV__`

22. **Massive commented-out code blocks**
    - Files: router.ts, signal.ts, jsx-runtime.ts, context.ts
    - Fix: Remove dead code; use version control for history

---

## Architecture Summary

```
                    @awc/reactive (signal.ts)
                    ┌───────────────────────┐
                    │  createSignal          │
                    │  createEffect          │
                    │  createMemo            │
                    │  createResource        │
                    │  createRoot            │
                    │  Suspense primitives   │
                    │  Context (Owner-based) │
                    └──────────┬────────────┘
                               │
                    ┌──────────┴────────────┐
                    │      @awc/dom          │
                    │  runtime.ts            │
                    │  ├─ insert()           │
                    │  ├─ spread()           │
                    │  ├─ reconcileArrays()  │
                    │  └─ render()/hydrate() │
                    │  integration.ts        │
                    │  └─ globalThis bridge  │
                    │  server-renderer.ts    │
                    │  └─ renderNode()       │
                    └──────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                 │
    @awc/jsx-runtime    @awc/kettlejs       Lit HTML
    ┌─────────────┐   ┌──────────────┐   ┌──────────┐
    │ jsx()       │   │ Router       │   │ html``   │
    │ jsxs()      │   │ Suspense     │   │ (lit)    │
    │ createElement│  │ Context      │   │          │
    │ mergeProps  │   │ Component    │   │          │
    │ splitProps  │   │ SSR          │   │          │
    └─────────────┘   └──────────────┘   └──────────┘
```

**Core issue:** The architecture claims renderer-agnosticism but the JSX and Lit paths diverge at the element creation level. The shared primitives (signals, context, Suspense) work across both, but the DOM manipulation is duplicated across `jsx-runtime.ts` (direct DOM) and `runtime.ts` (Lit template processing + direct DOM).

**Recommended path forward:** Fix items 1-8 (MUST FIX) first. Items 1-2 are foundational — without correct dependency tracking and ownership cleanup, all higher-level features (Suspense, Resources, Router) will have cascading bugs. Item 5 (promise swallowing) unblocks proper Suspense integration. Items 3-4 (router) can then be fixed once the reactive core is sound.
