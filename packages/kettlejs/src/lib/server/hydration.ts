/**
 * @fileoverview Hydration utilities for KettleJS
 * @module @awc/kettlejs/server/hydration
 *
 * Implements Section 11 of SPEC.md: HYDRATION
 * - DOM reused (no recreation)
 * - No component execution (components ran on server)
 * - Bindings reattached
 * - Structural markers required
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Hydration data structure
 */
export interface HydrationData {
  [key: string]: any;
}

// ============================================================================
// STATE
// ============================================================================

/**
 * Global hydration flag
 * Section 11: Indicates if we're currently hydrating
 */
let hydrating = false;

/**
 * Hydration data registry
 * Stores data serialized on server and consumed on client
 */
const hydrationDataMap = new Map<string, any>();

/**
 * Hydration marker counter for unique IDs
 */
let markerCounter = 0;

// ============================================================================
// HYDRATION STATE
// ============================================================================

/**
 * Check if currently hydrating
 *
 * Section 11: During hydration, DOM is reused, not recreated
 *
 * @returns {boolean} True if hydrating
 *
 * @example
 * ```typescript
 * import { isHydrating } from '@awc/kettlejs/server';
 *
 * if (isHydrating()) {
 *   // Reuse existing DOM
 * }
 * ```
 */
export function isHydrating(): boolean {
  return hydrating;
}

/**
 * Set hydration state
 *
 * @param {boolean} state - Hydration state
 * @internal
 */
export function setHydrating(state: boolean): void {
  hydrating = state;
}

// ============================================================================
// HYDRATION DATA MANAGEMENT
// ============================================================================

/**
 * Store data for hydration
 *
 * Section 11: On server, store data to serialize into HTML
 * On client during hydration, this data is reused
 *
 * @param {string} key - Unique key
 * @param {any} data - Data to store
 *
 * @example
 * ```typescript
 * import { setHydrationData } from '@awc/kettlejs/server';
 *
 * // On server
 * setHydrationData('user', { id: 1, name: 'Alice' });
 * ```
 */
export function setHydrationData(key: string, data: any): void {
  hydrationDataMap.set(key, data);
}

/**
 * Get hydration data
 *
 * Section 11: On client, retrieve data stored on server
 *
 * @param {string} key - Unique key
 * @returns {any} Data or undefined
 *
 * @example
 * ```typescript
 * import { getHydrationData } from '@awc/kettlejs/server';
 *
 * // On client
 * const user = getHydrationData('user');
 * ```
 */
export function getHydrationData(key: string): any {
  return hydrationDataMap.get(key);
}

/**
 * Check if hydration data exists
 *
 * @param {string} key - Unique key
 * @returns {boolean} True if exists
 */
export function hasHydrationData(key: string): boolean {
  return hydrationDataMap.has(key);
}

/**
 * Clear all hydration data
 *
 * @internal
 */
export function clearHydrationData(): void {
  hydrationDataMap.clear();
}

/**
 * Clear specific hydration data
 *
 * @param {string} key - Key to clear
 */
export function clearHydrationDataKey(key: string): void {
  hydrationDataMap.delete(key);
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serialize hydration data to script tag
 *
 * Section 11: Embed data in HTML for client hydration
 *
 * @returns {string} Script tag with JSON data
 *
 * @example
 * ```typescript
 * import { serializeHydrationData } from '@awc/kettlejs/server';
 *
 * const html = await renderToString(() => App());
 * const script = serializeHydrationData();
 * return html + script;
 * ```
 */
export function serializeHydrationData(): string {
  if (hydrationDataMap.size === 0) {
    return '';
  }

  const data = Object.fromEntries(hydrationDataMap);
  const json = JSON.stringify(data);

  return `<script type="application/json" id="__KETTLE_HYDRATION__">${json}</script>`;
}

/**
 * Deserialize hydration data from DOM
 *
 * Section 11: On client, load data from script tag
 *
 * @returns {boolean} True if data was loaded
 *
 * @example
 * ```typescript
 * import { deserializeHydrationData } from '@awc/kettlejs/server';
 *
 * // On client startup
 * if (deserializeHydrationData()) {
 *   console.log('Hydration data loaded');
 * }
 * ```
 */
export function deserializeHydrationData(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const script = document.getElementById('__KETTLE_HYDRATION__');
  if (!script || script.getAttribute('type') !== 'application/json') {
    return false;
  }

  try {
    const json = script.textContent || '{}';
    const data = JSON.parse(json);

    for (const [key, value] of Object.entries(data)) {
      hydrationDataMap.set(key, value);
    }

    return true;
  } catch (error) {
    console.error('Failed to deserialize hydration data:', error);
    return false;
  }
}

// ============================================================================
// HYDRATION MARKERS
// ============================================================================

/**
 * Generate unique hydration marker ID
 *
 * @returns {string} Unique marker ID
 * @internal
 */
export function generateMarkerID(): string {
  return `h${markerCounter++}`;
}

/**
 * Create hydration marker
 *
 * Section 11: Structural markers required for hydration points
 *
 * @param {string} id - Marker ID
 * @returns {string} HTML comment marker
 *
 * @example
 * ```typescript
 * import { hydrationMarker } from '@awc/kettlejs/server';
 *
 * const marker = hydrationMarker('component-1');
 * // Returns: <!--h:component-1-->
 * ```
 */
export function hydrationMarker(id: string): string {
  return `<!--#${id}-->`;
}

/**
 * Create start hydration marker
 *
 * @param {string} id - Marker ID
 * @returns {string} Start marker
 */
export function hydrationMarkerStart(id: string): string {
  return `<!--#${id}-->`;
}

/**
 * Create end hydration marker
 *
 * @param {string} id - Marker ID
 * @returns {string} End marker
 */
export function hydrationMarkerEnd(id: string): string {
  return `<!--/${id}-->`;
}

// ============================================================================
// RESOURCE HYDRATION
// ============================================================================

/**
 * Create hydration-friendly resource
 *
 * Section 11: Resources loaded on server are serialized
 * On client, reused during hydration (no re-fetch)
 *
 * @template T
 * @param {string} key - Unique resource key
 * @param {() => Promise<T>} fetcher - Resource fetcher
 * @returns {() => Promise<T>} Hydration-aware fetcher
 *
 * @example
 * ```typescript
 * import { createHydratableResource } from '@awc/kettlejs/server';
 *
 * const loadUser = createHydratableResource('user', async () => {
 *   const res = await fetch('/api/user');
 *   return res.json();
 * });
 * ```
 */
export function createHydratableResource<T>(
  key: string,
  fetcher: () => Promise<T>
): () => Promise<T> {
  return async () => {
    // Section 11: During hydration or on client, check for cached data
    if (isHydrating() || typeof window !== 'undefined') {
      const cached = getHydrationData(key);
      if (cached !== undefined) {
        return cached as T;
      }
    }

    // Server or no cache: fetch data
    const data = await fetcher();

    // Section 11: On server, store for serialization
    if (typeof window === 'undefined') {
      setHydrationData(key, data);
    }

    return data;
  };
}

/**
 * Use hydration data in component
 *
 * Section 11: Components use hydration data to restore state
 * without re-execution
 *
 * @template T
 * @param {string} key - Data key
 * @param {T | (() => T)} value - Value or getter
 * @returns {T} Value
 *
 * @example
 * ```typescript
 * import { useHydrationData } from '@awc/kettlejs/server';
 *
 * const MyComponent = () => {
 *   const data = useHydrationData('my-data', { initial: true });
 *   return html`<div>${JSON.stringify(data)}</div>`;
 * };
 * ```
 */
export function useHydrationData<T>(key: string, value: T | (() => T)): T {
  // Section 11: Check for hydration data first
  const hydrationData = getHydrationData(key);
  if (hydrationData !== undefined) {
    return hydrationData as T;
  }

  // Compute or use provided value
  const computedValue =
    typeof value === 'function' ? (value as () => T)() : value;

  // Section 11: On server, store for serialization
  if (typeof window === 'undefined') {
    setHydrationData(key, computedValue);
  }

  return computedValue;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleanup hydration artifacts from DOM
 *
 * Section 11: After hydration, remove markers and serialized data
 *
 * @example
 * ```typescript
 * import { cleanupHydration } from '@awc/kettlejs/server';
 *
 * // After hydration completes
 * cleanupHydration();
 * ```
 */
export function cleanupHydration(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Remove hydration data script
  const script = document.getElementById('__KETTLE_HYDRATION__');
  if (script) {
    script.remove();
  }

  // Remove hydration markers (comments)
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_COMMENT,
    null
  );

  const comments: Comment[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const comment = node as Comment;
    const text = comment.nodeValue || '';
    if (text.startsWith('#') || text.startsWith('/')) {
      comments.push(comment);
    }
  }

  comments.forEach((comment) => comment.remove());

  // Clear hydration data from memory
  clearHydrationData();
}

/**
 * Auto-cleanup hydration on page load (client-side)
 */
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Delay cleanup to ensure hydration is complete
    setTimeout(cleanupHydration, 100);
  });
}

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

/**
 * Check if on server
 *
 * @returns {boolean} True if server
 */
export function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if on client
 *
 * @returns {boolean} True if client
 */
export function isClientEnvironment(): boolean {
  return typeof window !== 'undefined';
}
