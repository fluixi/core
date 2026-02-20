// /**
//  * @fileoverview Control Flow Components for Reactive DOM
//  * @module @awc/dom/control-flow
//  *
//  * This module provides control flow components similar to SolidJS:
//  * - Show: Conditional rendering
//  * - For: Keyed list rendering
//  * - Index: Index-based list rendering
//  * - Switch/Match: Multi-way branching
//  * - Portal: Render in a different DOM location
//  * - Dynamic: Dynamic component rendering
//  * - ErrorBoundary: Error handling
//  */

// import {
//   insert,
//   createTextNode,
//   resolveValue,
//   isAccessor,
//   createRenderEffect,
// } from './runtime.js';

// // ============================================================================
// // Types
// // ============================================================================

// export interface ShowProps<T> {
//   when: T | (() => T);
//   fallback?: any;
//   children: any | ((item: NonNullable<T>) => any);
// }

// export interface ForProps<T> {
//   each: T[] | (() => T[]);
//   fallback?: any;
//   children: (item: T, index: () => number) => any;
// }

// export interface IndexProps<T> {
//   each: T[] | (() => T[]);
//   fallback?: any;
//   children: (item: () => T, index: number) => any;
// }

// export interface SwitchProps {
//   fallback?: any;
//   children: any;
// }

// export interface MatchProps<T> {
//   when: T | (() => T);
//   children: any | ((item: NonNullable<T>) => any);
// }

// export interface PortalProps {
//   mount?: Element;
//   useShadow?: boolean;
//   ref?: (element: Element) => void;
//   children: any;
// }

// export interface DynamicProps<T> {
//   component: T | (() => T);
//   children?: any;
//   [key: string]: any;
// }

// export interface ErrorBoundaryProps {
//   fallback: (error: Error, reset: () => void) => any;
//   children: any;
// }

// // ============================================================================
// // Show - Conditional Rendering
// // ============================================================================

// /**
//  * Show component for conditional rendering
//  * Only renders children when condition is truthy
//  *
//  * @example
//  * ```tsx
//  * <Show when={user()} fallback={<div>Loading...</div>}>
//  *   {user => <div>Hello {user.name}</div>}
//  * </Show>
//  * ```
//  */
// export function Show<T>(props: ShowProps<T>): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let current: Node | Node[] | null = null;
//   let condition: T | undefined;

//   const dispose = createRenderEffect(() => {
//     const c =
//       typeof props.when === 'function' ? (props.when as any)() : props.when;

//     if (c) {
//       // Condition is truthy
//       if (condition !== c) {
//         condition = c as T;
//         const child =
//           typeof props.children === 'function'
//             ? props.children(c as NonNullable<T>)
//             : props.children;

//         const result = insert(parent, child, marker, current || undefined);
//         current = typeof result === 'function' ? result() : result;
//       }
//     } else {
//       // Condition is falsy
//       if (condition !== undefined || current !== null) {
//         condition = undefined;
//         const result = insert(
//           parent,
//           props.fallback,
//           marker,
//           current || undefined
//         );
//         current = typeof result === 'function' ? result() : result;
//       }
//     }
//   });

//   // Return the fragment or marker for insertion
//   return marker;
// }

// // ============================================================================
// // For - Keyed List Rendering
// // ============================================================================

// /**
//  * For component for efficiently rendering keyed lists
//  * Tracks items by reference for optimal updates
//  *
//  * @example
//  * ```tsx
//  * <For each={items()} fallback={<div>No items</div>}>
//  *   {(item, index) => <div>{index()}: {item.name}</div>}
//  * </For>
//  * ```
//  */
// export function For<T>(props: ForProps<T>): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let items: T[] = [];
//   let mapped: Array<{ item: T; index: number; nodes: Node | Node[] }> = [];

//   const dispose = createRenderEffect(() => {
//     const newItems =
//       (typeof props.each === 'function' ? (props.each as any)() : props.each) ||
//       [];

//     if (newItems.length === 0) {
//       // Show fallback if no items
//       if (mapped.length > 0) {
//         cleanup();
//       }
//       if (props.fallback) {
//         insert(parent, props.fallback, marker, undefined);
//       }
//       return;
//     }

//     // Map tracking
//     const temp: Array<{ item: T; index: number; nodes: Node | Node[] }> = [];
//     const newMapped: Array<{ item: T; index: number; nodes: Node | Node[] }> =
//       [];

//     // Find existing items
//     for (let i = 0; i < newItems.length; i++) {
//       const item = newItems[i];
//       const existing = mapped.find((m) => m.item === item);

//       if (existing) {
//         // Item exists, update index
//         newMapped.push({
//           item,
//           index: i,
//           nodes: existing.nodes,
//         });
//       } else {
//         // New item, create nodes
//         const indexAccessor = () => {
//           const found = newMapped.find((m) => m.item === item);
//           return found ? found.index : i;
//         };

//         const nodes = props.children(item, indexAccessor);
//         newMapped.push({ item, index: i, nodes });
//       }
//     }

//     // Update DOM
//     reconcileFor(parent, mapped, newMapped, marker);

//     items = newItems;
//     mapped = newMapped;
//   });

//   return marker;
// }

// function reconcileFor<T>(
//   parent: Node,
//   oldMapped: Array<{ item: T; index: number; nodes: Node | Node[] }>,
//   newMapped: Array<{ item: T; index: number; nodes: Node | Node[] }>,
//   marker: Node
// ): void {
//   // Simple reconciliation - can be optimized further
//   if (oldMapped.length === 0) {
//     // Insert all new
//     for (const mapped of newMapped) {
//       insertNodes(parent, mapped.nodes, marker);
//     }
//     return;
//   }

//   if (newMapped.length === 0) {
//     // Remove all old
//     for (const mapped of oldMapped) {
//       removeNodes(parent, mapped.nodes);
//     }
//     return;
//   }

//   // Full reconciliation
//   const oldMap = new Map(oldMapped.map((m) => [m.item, m]));
//   const newMap = new Map(newMapped.map((m) => [m.item, m]));

//   // Remove items not in new list
//   for (const old of oldMapped) {
//     if (!newMap.has(old.item)) {
//       removeNodes(parent, old.nodes);
//     }
//   }

//   // Add/move items
//   let previousNode: Node | null = null;
//   for (let i = 0; i < newMapped.length; i++) {
//     const mapped = newMapped[i];
//     const nodes = Array.isArray(mapped.nodes) ? mapped.nodes : [mapped.nodes];

//     if (oldMap.has(mapped.item)) {
//       // Move if needed
//       const firstNode = nodes[0];
//       if (previousNode) {
//         if (previousNode.nextSibling !== firstNode) {
//           for (const node of nodes) {
//             parent.insertBefore(node, previousNode.nextSibling);
//           }
//         }
//       }
//     } else {
//       // Insert new
//       const insertPoint = previousNode ? previousNode.nextSibling : marker;
//       for (const node of nodes) {
//         parent.insertBefore(node, insertPoint);
//       }
//     }

//     previousNode = nodes[nodes.length - 1];
//   }
// }

// function insertNodes(parent: Node, nodes: Node | Node[], marker: Node): void {
//   const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
//   for (const node of nodeArray) {
//     parent.insertBefore(node, marker);
//   }
// }

// function removeNodes(parent: Node, nodes: Node | Node[]): void {
//   const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
//   for (const node of nodeArray) {
//     if (node.parentNode === parent) {
//       parent.removeChild(node);
//     }
//   }
// }

// function cleanup(): void {
//   // Cleanup logic if needed
// }

// // ============================================================================
// // Index - Index-based List Rendering
// // ============================================================================

// /**
//  * Index component for rendering lists with stable indices
//  * Use when items change but positions don't
//  *
//  * @example
//  * ```tsx
//  * <Index each={items()}>
//  *   {(item, index) => <div>{index}: {item().name}</div>}
//  * </Index>
//  * ```
//  */
// export function Index<T>(props: IndexProps<T>): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let items: T[] = [];
//   let mapped: Array<{ accessor: () => T; nodes: Node | Node[] }> = [];

//   const dispose = createRenderEffect(() => {
//     const newItems =
//       (typeof props.each === 'function' ? (props.each as any)() : props.each) ||
//       [];

//     if (newItems.length === 0) {
//       if (mapped.length > 0) {
//         for (const m of mapped) {
//           removeNodes(parent, m.nodes);
//         }
//         mapped = [];
//       }
//       if (props.fallback) {
//         insert(parent, props.fallback, marker, undefined);
//       }
//       return;
//     }

//     const newMapped: Array<{ accessor: () => T; nodes: Node | Node[] }> = [];

//     for (let i = 0; i < newItems.length; i++) {
//       if (i < mapped.length) {
//         // Update existing
//         const item = newItems[i];
//         const accessor = (() => {
//           let value = item;
//           return () => value;
//         })();
//         newMapped.push({ accessor, nodes: mapped[i].nodes });
//       } else {
//         // Create new
//         const item = newItems[i];
//         const accessor = (() => {
//           let value = item;
//           return () => value;
//         })();
//         const nodes = props.children(accessor, i);
//         newMapped.push({ accessor, nodes });
//         insertNodes(parent, nodes, marker);
//       }
//     }

//     // Remove extra
//     for (let i = newItems.length; i < mapped.length; i++) {
//       removeNodes(parent, mapped[i].nodes);
//     }

//     items = newItems;
//     mapped = newMapped;
//   });

//   return marker;
// }

// // ============================================================================
// // Switch/Match - Multi-way Branching
// // ============================================================================

// /**
//  * Switch component for multi-way conditional rendering
//  *
//  * @example
//  * ```tsx
//  * <Switch fallback={<div>Default</div>}>
//  *   <Match when={state() === 'loading'}>
//  *     <div>Loading...</div>
//  *   </Match>
//  *   <Match when={state() === 'error'}>
//  *     <div>Error!</div>
//  *   </Match>
//  * </Switch>
//  * ```
//  */
// export function Switch(props: SwitchProps): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let current: Node | Node[] | null = null;
//   let matchedIndex = -1;

//   const dispose = createRenderEffect(() => {
//     const children = Array.isArray(props.children)
//       ? props.children
//       : [props.children];
//     let matched = false;
//     let newIndex = -1;

//     for (let i = 0; i < children.length; i++) {
//       const child = children[i];

//       // Check if this is a Match component result
//       if (child && typeof child === 'object' && 'when' in child) {
//         const condition =
//           typeof child.when === 'function' ? (child.when as any)() : child.when;
//         if (condition) {
//           matched = true;
//           newIndex = i;

//           if (matchedIndex !== newIndex) {
//             const content =
//               typeof child.children === 'function'
//                 ? child.children(condition)
//                 : child.children;
//             const result = insert(
//               parent,
//               content,
//               marker,
//               current || undefined
//             );
//             current = typeof result === 'function' ? result() : result;
//             matchedIndex = newIndex;
//           }
//           break;
//         }
//       }
//     }

//     if (!matched) {
//       if (matchedIndex !== -1 || current !== null) {
//         const result = insert(
//           parent,
//           props.fallback,
//           marker,
//           current || undefined
//         );
//         current = typeof result === 'function' ? result() : result;
//         matchedIndex = -1;
//       }
//     }
//   });

//   return marker;
// }

// /**
//  * Match component - used inside Switch
//  */
// export function Match<T>(props: MatchProps<T>): {
//   when: T | (() => T);
//   children: any;
// } {
//   // This returns a descriptor object for Switch to process
//   return props as any;
// }

// // ============================================================================
// // Portal - Render to Different DOM Location
// // ============================================================================

// /**
//  * Portal component for rendering content outside the component tree
//  *
//  * @example
//  * ```tsx
//  * <Portal mount={document.body}>
//  *   <div class="modal">Modal content</div>
//  * </Portal>
//  * ```
//  */
// export function Portal(props: PortalProps): Node {
//   const marker = createTextNode('');
//   const container = props.mount || document.body;

//   const dispose = createRenderEffect(() => {
//     insert(container, props.children);
//   });

//   if (props.ref) {
//     props.ref(container);
//   }

//   return marker;
// }

// // ============================================================================
// // Dynamic - Dynamic Component Rendering
// // ============================================================================

// /**
//  * Dynamic component for rendering components determined at runtime
//  *
//  * @example
//  * ```tsx
//  * <Dynamic component={activeComponent()} {...props} />
//  * ```
//  */
// export function Dynamic<T>(props: DynamicProps<T>): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let current: Node | Node[] | null = null;
//   let currentComponent: any = null;

//   const dispose = createRenderEffect(() => {
//     const component =
//       typeof props.component === 'function'
//         ? (props.component as any)()
//         : props.component;

//     if (component !== currentComponent) {
//       currentComponent = component;

//       if (typeof component === 'function') {
//         // Extract props (everything except 'component')
//         const { component: _, children, ...rest } = props;
//         const result = component({ ...rest, children });
//         const insertResult = insert(
//           parent,
//           result,
//           marker,
//           current || undefined
//         );
//         current =
//           typeof insertResult === 'function' ? insertResult() : insertResult;
//       } else if (typeof component === 'string') {
//         // Native element
//         const element = document.createElement(component);
//         const { component: _, children, ...rest } = props;

//         // Apply props
//         for (const key in rest) {
//           (element as any)[key] = rest[key];
//         }

//         if (children) {
//           insert(element, children);
//         }

//         const insertResult = insert(
//           parent,
//           element,
//           marker,
//           current || undefined
//         );
//         current =
//           typeof insertResult === 'function' ? insertResult() : insertResult;
//       }
//     }
//   });

//   return marker;
// }

// // ============================================================================
// // ErrorBoundary - Error Handling
// // ============================================================================

// /**
//  * ErrorBoundary component for catching and handling errors
//  *
//  * @example
//  * ```tsx
//  * <ErrorBoundary fallback={(err, reset) => (
//  *   <div>
//  *     <p>Error: {err.message}</p>
//  *     <button onClick={reset}>Retry</button>
//  *   </div>
//  * )}>
//  *   <MyComponent />
//  * </ErrorBoundary>
//  * ```
//  */
// export function ErrorBoundary(props: ErrorBoundaryProps): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let current: Node | Node[] | null = null;
//   let error: Error | null = null;

//   const reset = () => {
//     error = null;
//     renderChildren();
//   };

//   const renderChildren = () => {
//     try {
//       const result = insert(
//         parent,
//         props.children,
//         marker,
//         current || undefined
//       );
//       current = typeof result === 'function' ? result() : result;
//     } catch (err) {
//       error = err as Error;
//       renderError();
//     }
//   };

//   const renderError = () => {
//     if (error) {
//       const result = insert(
//         parent,
//         props.fallback(error, reset),
//         marker,
//         current || undefined
//       );
//       current = typeof result === 'function' ? result() : result;
//     }
//   };

//   createRenderEffect(() => {
//     if (error) {
//       renderError();
//     } else {
//       renderChildren();
//     }
//   });

//   return marker;
// }

// // ============================================================================
// // Suspense - Async Resource Handling
// // ============================================================================

// export interface SuspenseProps {
//   fallback: any;
//   children: any;
// }

// /**
//  * Suspense component for handling async resources
//  *
//  * @example
//  * ```tsx
//  * <Suspense fallback={<div>Loading...</div>}>
//  *   <AsyncComponent />
//  * </Suspense>
//  * ```
//  */
// export function Suspense(props: SuspenseProps): Node {
//   const marker = createTextNode('');
//   const parent = document.createDocumentFragment();
//   parent.appendChild(marker);

//   let current: Node | Node[] | null = null;
//   let suspended = false;

//   const dispose = createRenderEffect(() => {
//     try {
//       if (suspended) {
//         const result = insert(
//           parent,
//           props.fallback,
//           marker,
//           current || undefined
//         );
//         current = typeof result === 'function' ? result() : result;
//       } else {
//         const result = insert(
//           parent,
//           props.children,
//           marker,
//           current || undefined
//         );
//         current = typeof result === 'function' ? result() : result;
//       }
//     } catch (promise) {
//       if (promise instanceof Promise) {
//         suspended = true;
//         const result = insert(
//           parent,
//           props.fallback,
//           marker,
//           current || undefined
//         );
//         current = typeof result === 'function' ? result() : result;

//         promise.then(() => {
//           suspended = false;
//           const result = insert(
//             parent,
//             props.children,
//             marker,
//             current || undefined
//           );
//           current = typeof result === 'function' ? result() : result;
//         });
//       }
//     }
//   });

//   return marker;
// }

// // ============================================================================
// // Exports
// // ============================================================================

// export default {
//   Show,
//   For,
//   Index,
//   Switch,
//   Match,
//   Portal,
//   Dynamic,
//   ErrorBoundary,
//   Suspense,
// };
