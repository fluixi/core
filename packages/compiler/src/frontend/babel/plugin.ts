/**
 * @fileoverview Comprehensive Babel Plugin for Reactive JSX Transformation
 * @module @fluixi/babel-plugin-jsx
 *
 * This plugin transforms JSX into optimized reactive DOM operations with:
 * - Fine-grained reactivity detection
 * - Signal/store wrapping
 * - Event delegation
 * - Static hoisting
 * - Lit-HTML integration
 * - Control flow optimization
 */

import { declare } from '@babel/helper-plugin-utils';
import {
  NodePath,
  types as t,
  template,
  type PluginObj,
  type PluginPass,
} from '@babel/core';
import { buildIR } from './build-ir.js';
import { imperativeBackend } from '../../codegen/backends/imperative.js';

// ============================================================================
// Types
// ============================================================================

export interface PluginOptions {
  /**
   * Automatically transform `{() => cond && <JSX />}` and
   * `{() => cond ? <JSX /> : null}` patterns into `<Show>` components.
   * Prevents entire sub-trees from being recreated on every signal change.
   * @default false
   */
  autoShowTransform?: boolean;

  /**
   * JSX runtime mode
   * @default 'automatic'
   */
  runtime?: 'automatic' | 'classic';

  /**
   * Import source for JSX runtime
   * @default '@fluixi/jsx'
   */
  importSource?: string;

  /**
   * Classic mode pragma
   * @default 'jsx'
   */
  pragma?: string;

  /**
   * Classic mode fragment pragma
   * @default 'Fragment'
   */
  pragmaFrag?: string;

  /**
   * Enable development mode with additional checks
   * @default false
   */
  development?: boolean;

  /**
   * Auto-detect and wrap reactive expressions
   * @default true
   */
  detectReactivity?: boolean;

  /**
   * Use lit-html templates when beneficial
   * @default true
   */
  useLitHTML?: boolean;

  /**
   * Enable static element hoisting
   * @default true
   */
  hoistStatics?: boolean;

  /**
   * Enable event delegation
   * @default true
   */
  delegateEvents?: boolean;

  /**
   * Events to delegate
   * @default ['click', 'input', 'change', 'submit', 'focus', 'blur']
   */
  delegatedEvents?: string[];

  /**
   * Optimize control flow components
   * @default true
   */
  optimizeControlFlow?: boolean;

  /**
   * Generate source maps
   * @default true
   */
  sourceMaps?: boolean;

  /**
   * Module name for signal directive
   * @default '@fluixi/dom'
   */
  signalModule?: string;

  /**
   * Module name for control flow
   * @default '@fluixi/dom'
   */
  controlFlowModule?: string;

  /**
   * Code-generation backend.
   * - 'imperative' (default): emit direct compiled calls into the @fluixi/dom
   *   runtime (createNativeElement/spread/insert/createComponent) — no per-render
   *   jsx() dispatch. Targets RUNTIME_CONTRACT_V1.
   * - 'jsx': emit the automatic runtime (jsx()/jsxs()) — the runtime interprets
   *   the calls.
   * @default 'imperative'
   */
  backend?: 'jsx' | 'imperative';

  /**
   * Which imperative codegen path to use (only relevant when backend is
   * 'imperative'):
   * - 'inline': the plugin builds the runtime calls directly from the JSX AST
   *   (no string reparse). Default.
   * - 'ir': route through the shared host-agnostic pipeline — build IR
   *   (build-ir.ts) then run the imperative backend's emit(), reparsing the
   *   emitted code. Same output; this is the path a future SWC front-end reuses.
   * @default 'inline'
   */
  codegen?: 'inline' | 'ir';
}

interface PluginStateData {
  hasJSX: boolean;
  hasReactivity: boolean;
  hasLitHTML: boolean;
  needsSignalImport: boolean;
  needsControlFlowImport: boolean;
  needsCreateMemo: boolean;
  controlFlowComponents: Set<string>;
  delegatedEvents: Set<string>;
  staticElements: Map<string, t.Expression>;
  staticCounter: number;
  libModule: string;
  backend: 'jsx' | 'imperative';
  codegen: 'inline' | 'ir';
  /** runtime symbols emitted by the IR pipeline (codegen 'ir'), for import injection */
  irImports: Set<string>;
  // imperative-backend usage flags (set during emission)
  needsCreateNativeElement?: boolean;
  needsInsert?: boolean;
  needsSpread?: boolean;
  needsCreateComponent?: boolean;
  needsMergeProps?: boolean;
}

type PluginState = PluginPass & PluginStateData;

// ============================================================================
// Constants
// ============================================================================

const CONTROL_FLOW_COMPONENTS = new Set([
  'Show',
  'For',
  'Index',
  'Switch',
  'Match',
  'Portal',
  'Dynamic',
  'ErrorBoundary',
  'Suspense',
]);

// Control-flow components read a single reactive *value* prop inside their own tracking
// scope. Emit that prop as a getter (like `children`) so reading it re-runs the caller's
// expression — otherwise `each={items()}` / `when={cond()}` snapshot once and never update.
// The runtime routes these through `resolveReactiveProp`, which also unwraps the accessor
// form (`each={items}`), so all three shapes work with no compiler-side ambiguity.
//
// Excluded on purpose: `Dynamic.component` (a component IS a function, so the value can't be
// told apart from an accessor — its idiomatic `component={signal}` form already reacts) and
// `Portal.mount` (read once at mount, not a reactive value).
const CONTROL_FLOW_VALUE_PROPS: Record<string, string> = {
  Show: 'when',
  For: 'each',
  Index: 'each',
  Match: 'when',
};

const REACTIVE_PATTERNS = {
  signalCall: /\w+\(\)$/,
  storeAccess: /\w+\.\w+/,
  arrowFunction: /^\(\)\s*=>/,
  functionCall: /^function\s*\(/,
};

const EVENT_PROPS = /^on[A-Z]/;

const DELEGATABLE_EVENTS = [
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'focus',
  'blur',
  'keydown',
  'keyup',
  'keypress',
  'mousedown',
  'mouseup',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
];

// ============================================================================
// Main Plugin
// ============================================================================

export default declare((api, options: PluginOptions = {}): PluginObj => {
  api.assertVersion(7);

  const {
    runtime = 'automatic',
    importSource = '@fluixi/jsx',
    pragma = 'jsx',
    pragmaFrag = 'Fragment',
    development = false,
    detectReactivity = true,
    useLitHTML = true,
    hoistStatics = true,
    delegateEvents = true,
    delegatedEvents = DELEGATABLE_EVENTS,
    optimizeControlFlow = true,
    sourceMaps = true,
    signalModule = '@fluixi/dom',
    controlFlowModule = '@fluixi/dom',
    autoShowTransform = false,
    backend = 'imperative',
    codegen = 'inline',
  } = options;

  const pluginState: PluginStateData = {
    backend,
    codegen,
    irImports: new Set<string>(),
    libModule: '@fluixi/core',
    hasJSX: false,
    hasReactivity: false,
    hasLitHTML: false,
    needsSignalImport: false,
    needsControlFlowImport: false,
    needsCreateMemo: false,
    controlFlowComponents: new Set(),
    delegatedEvents: new Set(),
    staticElements: new Map(),
    staticCounter: 0,
  };

  return {
    name: '@fluixi/babel-plugin-jsx',

    manipulateOptions(opts, parserOpts) {
      // Enable JSX parsing
      parserOpts.plugins.push('jsx', 'typescript');
    },

    pre(state) {
      // Initialize plugin state
      Object.assign(state, pluginState);
    },

    visitor: {
      // Map @fluixi/core/rx imports to @fluixi/reactive for client-side code
      ImportDeclaration(path, state: any) {
        const source = path.node.source.value;

        // Map @fluixi/core/rx to @fluixi/reactive (client-side reactive primitives)
        if (source === '@fluixi/core/rx') {
          path.node.source = t.stringLiteral('@fluixi/reactive');
        }

        // Also handle fluixi server imports - keep as is for SSR
        // @fluixi/core/server stays as is (includes server reactive mappings)
      },

      Program: {
        enter(path, state: any) {
          // Reset state for new file
          Object.assign(state, {
            hasJSX: false,
            hasReactivity: false,
            hasLitHTML: false,
            needsSignalImport: false,
            needsLitrxImport: false,
            needsControlFlowImport: false,
            needsCreateMemo: false,
            controlFlowComponents: new Set(),
            delegatedEvents: new Set(),
            staticElements: new Map(),
            autoShow: autoShowTransform,
            staticCounter: 0,
            libModule: '@fluixi/core',
            backend,
            codegen,
            irImports: new Set<string>(),
            needsCreateNativeElement: false,
            needsInsert: false,
            needsSpread: false,
            needsCreateComponent: false,
            needsMergeProps: false,
          });
        },

        exit(path, state: any) {
          const imports: t.ImportDeclaration[] = [];
          if (!state.hasJSX) {
            // Add signal directive import if needed
            if (state.needsSignalImport) {
              imports.push(
                t.importDeclaration(
                  [
                    t.importSpecifier(
                      t.identifier('signal'),
                      t.identifier('signal')
                    ),
                  ],
                  t.stringLiteral(signalModule)
                )
              );
            }
            if (state.needsLitrxImport && !path.scope.hasBinding('litrx')) {
              imports.push(
                t.importDeclaration(
                  [
                    t.importSpecifier(
                      t.identifier('litrx'),
                      t.identifier('litrx')
                    ),
                  ],
                  t.stringLiteral(state.libModule)
                )
              );
            }
          }

          if (state.hasJSX) {
            if (backend === 'imperative' && codegen === 'ir') {
              // IR pipeline: import exactly the symbols emit() reported, splitting
              // control-flow components to the control-flow module.
              const CF = new Set([
                'Show', 'For', 'Index', 'Switch', 'Match',
                'Dynamic', 'ErrorBoundary', 'Portal', 'Suspense',
              ]);
              const all = Array.from(state.irImports as Set<string>);
              const spec = (n: string) =>
                t.importSpecifier(t.identifier(n), t.identifier(n));
              const core = all.filter((s) => !CF.has(s) && !path.scope.hasBinding(s));
              const cf = all.filter((s) => CF.has(s) && !path.scope.hasBinding(s));
              if (core.length > 0) {
                imports.push(
                  t.importDeclaration(core.map(spec), t.stringLiteral(signalModule)),
                );
              }
              if (cf.length > 0) {
                imports.push(
                  t.importDeclaration(cf.map(spec), t.stringLiteral(controlFlowModule)),
                );
              }
            } else if (backend === 'imperative') {
              // Compiled imperative output: import only the runtime primitives
              // actually emitted, straight from the dom runtime module.
              const want: Array<[boolean, string]> = [
                [!!state.needsCreateNativeElement, 'createNativeElement'],
                [!!state.needsSpread, 'spread'],
                [!!state.needsInsert, 'insert'],
                [!!state.needsCreateComponent, 'createComponent'],
                [!!state.needsMergeProps, 'mergeProps'],
              ];
              const specifiers = want
                .filter(([need, name]) => need && !path.scope.hasBinding(name))
                .map(([, name]) =>
                  t.importSpecifier(t.identifier(name), t.identifier(name)),
                );
              if (specifiers.length > 0) {
                imports.push(
                  t.importDeclaration(specifiers, t.stringLiteral(signalModule)),
                );
              }
            } else if (runtime === 'automatic') {
              // Add JSX runtime imports
              const specifiers = [
                t.importSpecifier(t.identifier('jsx'), t.identifier('jsx')),
                t.importSpecifier(t.identifier('jsxs'), t.identifier('jsxs')),
                t.importSpecifier(
                  t.identifier('Fragment'),
                  t.identifier('Fragment')
                ),
              ];

              if (development) {
                specifiers.push(
                  t.importSpecifier(
                    t.identifier('jsxDEV'),
                    t.identifier('jsxDEV')
                  )
                );
              }

              // Add mergeProps import if spreads are used
              if (state.needsMergeProps) {
                specifiers.push(
                  t.importSpecifier(
                    t.identifier('mergeProps'),
                    t.identifier('mergeProps')
                  )
                );
              }

              imports.push(
                t.importDeclaration(specifiers, t.stringLiteral(importSource))
              );
            }

            // Add createMemo import when conditionals/components are wrapped as
            // memos. In imperative mode it comes from the dom runtime.
            if (state.needsCreateMemo && !path.scope.hasBinding('createMemo')) {
              imports.push(
                t.importDeclaration(
                  [t.importSpecifier(t.identifier('createMemo'), t.identifier('createMemo'))],
                  t.stringLiteral(
                    backend === 'imperative'
                      ? signalModule
                      : state.libModule ?? '@fluixi/core',
                  ),
                ),
              );
            }

            // Add control flow imports for auto-transformed components (Show, etc.)
            // Only add components that aren't already bound in the file scope.
            if (
              state.needsControlFlowImport &&
              state.controlFlowComponents.size > 0
            ) {
              const unbound = (Array.from(state.controlFlowComponents) as string[]).filter(
                (name) => !path.scope.hasBinding(name),
              );
              if (unbound.length > 0) {
                const specifiers = unbound.map((name) =>
                  t.importSpecifier(t.identifier(name), t.identifier(name)),
                );
                imports.push(
                  t.importDeclaration(
                    specifiers,
                    t.stringLiteral(controlFlowModule),
                  ),
                );
              }
            }

            // Add event delegation setup if needed
            if (delegateEvents && state.delegatedEvents.size > 0) {
              imports.push(
                t.importDeclaration(
                  [
                    t.importSpecifier(
                      t.identifier('delegateEvents'),
                      t.identifier('delegateEvents')
                    ),
                  ],
                  t.stringLiteral(
                    backend === 'imperative' ? signalModule : '@fluixi/jsx',
                  )
                )
              );

              // Add delegateEvents call at top of program
              const eventsArray = t.arrayExpression(
                (Array.from(state.delegatedEvents) as string[]).map((event) =>
                  t.stringLiteral(event)
                )
              );
              const delegateCall = t.expressionStatement(
                t.callExpression(t.identifier('delegateEvents'), [eventsArray])
              );
              path.node.body.unshift(delegateCall);
            }

            // Add hoisted static elements
            if (hoistStatics && state.staticElements.size > 0) {
              const hoisted: t.VariableDeclaration[] = [];
              state.staticElements.forEach(
                (value: t.Expression, key: string) => {
                  hoisted.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(t.identifier(key), value),
                    ])
                  );
                }
              );
              path.node.body.unshift(...hoisted);
            }
          }

          // Add all imports at the top
          if (imports.length > 0) {
            // console.log('imports are', imports);
            // console.log('imports', imports);
            path.node.body.unshift(...imports);
          }
        },
      },

      JSXElement(path, state: any) {
        state.hasJSX = true;

        // IR pipeline path: build IR -> emit() -> reparse. Handles the whole
        // subtree, so we bypass the inline transform entirely.
        if (backend === 'imperative' && codegen === 'ir') {
          path.replaceWith(emitViaIR(path.node, state));
          return;
        }

        const element = path.node;
        const openingElement = element.openingElement;

        // Check if it's a control flow component
        if (
          t.isJSXIdentifier(openingElement.name) &&
          CONTROL_FLOW_COMPONENTS.has(openingElement.name.name)
        ) {
          state.controlFlowComponents.add(openingElement.name.name);

          if (optimizeControlFlow) {
            const optimized = optimizeControlFlowComponent(element, state);
            if (optimized) {
              path.replaceWith(optimized);
              return;
            }
          }
        }

        // Try to hoist static elements.
        // Not in imperative mode: hoisting a live DOM node would share one node
        // across renders. Static hoisting there needs template-clone (contract v2).
        if (hoistStatics && backend !== 'imperative' && isStaticElement(element, state)) {
          const hoisted = hoistStaticElement(element, state);
          if (hoisted) {
            path.replaceWith(hoisted);
            return;
          }
        }

        // Transform to JSX runtime calls
        const transformed = transformJSXElement(element, state, {
          runtime,
          pragma,
          development,
          detectReactivity,
          useLitHTML,
          autoShow: autoShowTransform,
        });

        path.replaceWith(transformed);
      },

      JSXFragment(path, state: any) {
        state.hasJSX = true;

        if (backend === 'imperative' && codegen === 'ir') {
          path.replaceWith(emitViaIR(path.node, state));
          return;
        }

        const transformed = transformJSXFragment(path.node, state, {
          runtime,
          pragmaFrag,
          development,
        });

        path.replaceWith(transformed);
      },

      // Detect reactive patterns in code
      CallExpression(path, state: any) {
        if (!detectReactivity) return;

        const callee = path.node.callee;
        if ((callee as any).name === 'handleToggle') {
          // console.log('call express', path);
        }

        // Detect signal creation
        if (
          t.isIdentifier(callee) &&
          (callee.name === 'createSignal' ||
            callee.name === 'createStore' ||
            callee.name === 'useContext' ||
            callee.name === 'useLocation')
        ) {
          // console.log('call express', callee.name);
          state.hasReactivity = true;
        }
      },
      // NOTE: JSXExpressionContainer visitor is intentionally a no-op.
      // JSXElement.enter fires BEFORE children are traversed, so by the time
      // Babel would visit nested JSXExpressionContainers the JSXElement has
      // already been replaced via path.replaceWith(). Attribute and children
      // expressions are processed directly in transformAttributeValue /
      // transformChildren above.
      JSXExpressionContainer(_path) {
        // no-op
      },
      TaggedTemplateExpression(path, state) {
        // const expressions = t.isTaggedTemplateExpression(path.node)
        //   ? (path as NodePath<t.TemplateLiteral>).get('expressions')
        //   : [(path as NodePath<t.JSXExpressionContainer>).get('expression')];

        // if (t.isJSXExpressionContainer(path.node)) {
        //   console.log('is jsx');
        // }
        const { tag, quasi } = path.node;

        // 1. Only target html`...`
        // if (!t.isIdentifier(tag) || tag.name !== 'html') return;

        path
          .get('quasi')
          .get('expressions')
          .forEach((expPath, index) => {
            const node = expPath.node;

            // 2. Attribute Check: Look at the string part right before the expression
            // Lit attributes look like: name="${exp}" or @click="${exp}"
            const prevStringPart = quasi.quasis[index].value.raw;
            const isAttribute =
              prevStringPart.trim().endsWith('=') ||
              prevStringPart.match(/@[\w-]+$/);

            if (isAttribute) return; // Skip wrapping event listeners or attributes

            // 3. Narrowing for Signal Calls: count()
            // const isSignalCall = t.isCallExpression(node);
            const isSignalCall = false;

            // 4. Narrowing for Member Access: item.$name
            let isReactiveMember = false;
            if (t.isMemberExpression(node)) {
              const property = node.property;
              // Use Type Guard to narrow from Expression | PrivateName to Identifier
              if (t.isIdentifier(property)) {
                // console.log('exp', node);
                (property as any).name = property.name.replace('$', '');
                state.needsLitrxImport = true;
                isReactiveMember = true;
                // if (property.name.startsWith('$')) {
                // }
              }
            }

            if (isSignalCall || isReactiveMember) {
              // Transform: ${exp} -> ${watch(() => exp)}
              expPath.replaceWith(
                //t.identifier('litrx')
                // t.identifier('(window as any).Fluixi.litrx')
                t.callExpression(
                  t.identifier('((window as any).Fluixi.litrx || litrx)'),
                  [t.arrowFunctionExpression([], node as t.Expression)]
                )
              );
            }
          });
      },
      // 'JSXExpressionContainer|TaggedTemplateExpression'(path, state) {
      //   const expressions = t.isTaggedTemplateExpression(path.node)
      //     ? (path as NodePath<t.TemplateLiteral>).get('expressions')
      //     : [(path as NodePath<t.JSXExpressionContainer>).get('expression')];

      //   if (t.isJSXExpressionContainer(path.node)) {
      //     console.log('is jsx');
      //   }
      //   console.log('exp', expressions);
      //   // const { tag, quasi } = path.node;

      //   // 1. Only target html`...`
      //   // if (!t.isIdentifier(tag) || tag.name !== 'html') return;

      //   // path
      //   //   .get('quasi')
      //   //   .get('expressions')
      //   //   .forEach((expPath, index) => {
      //   //     const node = expPath.node;

      //   //     // 2. Attribute Check: Look at the string part right before the expression
      //   //     // Lit attributes look like: name="${exp}" or @click="${exp}"
      //   //     const prevStringPart = quasi.quasis[index].value.raw;
      //   //     const isAttribute =
      //   //       prevStringPart.trim().endsWith('=') ||
      //   //       prevStringPart.match(/@[\w-]+$/);

      //   //     if (isAttribute) return; // Skip wrapping event listeners or attributes

      //   //     // 3. Narrowing for Signal Calls: count()
      //   //     // const isSignalCall = t.isCallExpression(node);
      //   //     const isSignalCall = false;

      //   //     // 4. Narrowing for Member Access: item.$name
      //   //     let isReactiveMember = false;
      //   //     if (t.isMemberExpression(node)) {
      //   //       const property = node.property;
      //   //       // Use Type Guard to narrow from Expression | PrivateName to Identifier
      //   //       if (t.isIdentifier(property)) {
      //   //         if (property.name.startsWith('$')) {
      //   //           (property as any).name = property.name.replace('$', '');
      //   //           console.log('node', node);
      //   //           state.needsLitrxImport = true;
      //   //           isReactiveMember = true;
      //   //         }
      //   //       }
      //   //     }

      //   //     if (isSignalCall || isReactiveMember) {
      //   //       // Transform: ${exp} -> ${watch(() => exp)}
      //   //       expPath.replaceWith(
      //   //         t.callExpression(t.identifier('litrx'), [
      //   //           t.arrowFunctionExpression([], node as t.Expression),
      //   //         ])
      //   //       );
      //   //     }
      //   //   });
      //   // path
      //   //   .get('quasi')
      //   //   .get('expressions')
      //   if (t.isTaggedTemplateExpression(path.node)) {
      //     expressions.forEach((expPath, index) => {
      //       const node = expPath.node;
      //       if (!node || t.isJSXEmptyExpression(node)) return;
      //       // 1. Skip Attributes (@click, id=, etc)
      //       if (t.isTaggedTemplateExpression(path.node)) {
      //         const { tag, quasi } = path.node;
      //         const prevString = quasi.quasis[index].value.raw;
      //         if (
      //           prevString.trim().endsWith('=') ||
      //           prevString.match(/@[\w-]+$/)
      //         ) {
      //           return;
      //         }
      //       }

      //       let shouldWrap = false;
      //       let newNode: t.Expression = node as t.Expression;
      //       let property: t.Expression;
      //       // 2. Handle Member Expressions (e.g., user.$name)
      //       if (t.isMemberExpression(node) && t.isIdentifier(node.property)) {
      //         const propName = node.property.name;
      //         property = node.property;

      //         // Check where the object (e.g., 'user') came from
      //         const objectName = t.isIdentifier(node.object)
      //           ? node.object.name
      //           : null;
      //         const binding = objectName
      //           ? expPath.scope.getBinding(objectName)
      //           : null;

      //         // Identify if the source is one of our reactive hooks
      //         const isReactiveSource =
      //           binding &&
      //           t.isVariableDeclarator(binding.path.node) &&
      //           t.isCallExpression(binding.path.node.init) &&
      //           t.isIdentifier(binding.path.node.init.callee) &&
      //           ['useReducer', 'createStore', 'useContext'].includes(
      //             binding.path.node.init.callee.name
      //           );
      //         if (isReactiveSource || propName.startsWith('$')) {
      //           shouldWrap = true;
      //           state.needsLitrxImport = true;
      //           console.log('nnedd wrap');
      //           // TRANSFORM: Strip the '$' for the runtime Proxy access
      //           // user.$name -> user.name
      //         }
      //         if (propName.startsWith('$')) {
      //           if (property) {
      //             (property as any).name = propName.replace('$', '');
      //             newNode = t.memberExpression(node.object, property);
      //           }
      //         }
      //       }

      //       // // 3. Handle Signal Calls: count()
      //       // if (t.isCallExpression(node)) {
      //       //   shouldWrap = true;
      //       // }

      //       if (shouldWrap) {
      //         state.needsLitrxImport = true;
      //         expPath.replaceWith(
      //           t.callExpression(t.identifier('litrx'), [
      //             t.arrowFunctionExpression([], newNode),
      //           ])
      //         );
      //       }
      //     });
      //   } else {
      //     console.log('jsx', expressions);
      //   }
      // },
    },
  };
});

function needReativeTransform(
  node: any,
  expPath: NodePath<t.Expression | t.TSType>
): boolean {
  if (t.isMemberExpression(node) && t.isIdentifier(node.property)) {
    // const propName = node.property.name;
    // property = node.property;

    // Check where the object (e.g., 'user') came from
    const objectName = t.isIdentifier(node.object) ? node.object.name : null;
    const binding = objectName ? expPath.scope.getBinding(objectName) : null;

    // Identify if the source is one of our reactive hooks
    const isReactiveSource =
      binding &&
      t.isVariableDeclarator(binding.path.node) &&
      t.isCallExpression(binding.path.node.init) &&
      t.isIdentifier(binding.path.node.init.callee) &&
      ['useReducer', 'createStore', 'useContext', 'useLocation'].includes(
        binding.path.node.init.callee.name
      );
    return isReactiveSource || false;
  }
  return false;
}
// ============================================================================
// JSX Transformation
// ============================================================================

function transformJSXElement(
  element: t.JSXElement,
  state: any,
  options: {
    runtime: 'automatic' | 'classic';
    pragma: string;
    development: boolean;
    detectReactivity: boolean;
    useLitHTML: boolean;
    autoShow?: boolean;
  }
): t.Expression {
  const { runtime, pragma, development, autoShow = true } = options;

  if (runtime === 'automatic') {
    return transformAutomaticElement(element, state, development, autoShow);
  } else {
    return transformClassicElement(element, state, pragma);
  }
}

// ============================================================================
// Imperative backend emission
//
// Emits direct calls into the @fluixi/dom runtime instead of jsx()/jsxs():
//   native element  ->  (() => { const _el = createNativeElement(tag);
//                                 spread({ element: _el, props });
//                                 insert(_el, children);
//                                 return _el; })()
//   component       ->  createMemo(() => createComponent(Comp, props))
// This matches @fluixi/jsx's component semantics exactly while removing
// the per-render jsx() dispatch for host elements. Targets RUNTIME_CONTRACT_V1.
// ============================================================================

// Build-time SVG detection, kept in lockstep with isSVGElement in the dom runtime.
const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline',
  'ellipse', 'g', 'defs', 'clipPath', 'text',
]);

/** Build the props object, merging spreads via mergeProps (reactivity-preserving). */
function buildPropsObject(
  props: Array<t.ObjectProperty | t.ObjectMethod>,
  spreads: t.Expression[],
  state: any,
): t.Expression {
  if (spreads.length > 0) {
    state.needsMergeProps = true;
    return t.callExpression(t.identifier('mergeProps'), [
      ...spreads,
      t.objectExpression(props),
    ]);
  }
  return t.objectExpression(props);
}

/** Wrap children expressions into a single value for `insert` / `children` prop. */
function childrenValue(children: t.Expression[]): t.Expression {
  return children.length === 1 ? children[0] : t.arrayExpression(children);
}

function emitImperativeElement(
  tag: t.Expression,
  isNative: boolean,
  props: Array<t.ObjectProperty | t.ObjectMethod>,
  spreads: t.Expression[],
  children: t.Expression[],
  state: any,
): t.Expression {
  if (!isNative) {
    // Component: children go into props as a LAZY getter, so child components are
    // created inside the component's execution (owner nesting for context/Suspense),
    // after the component runs (provider ordering), and lazily (ErrorBoundary catch).
    const allProps: Array<t.ObjectProperty | t.ObjectMethod> = [...props];
    if (children.length > 0) {
      allProps.push(
        t.objectMethod(
          'get',
          t.identifier('children'),
          [],
          t.blockStatement([t.returnStatement(childrenValue(children))]),
        ),
      );
    }

    return emitComponentCall(tag, buildPropsObject(allProps, spreads, state), state);
  }

  // Native element: createNativeElement + spread (attrs only) + insert (children).
  const tagName = (tag as t.StringLiteral).value;
  const isSVG = SVG_TAGS.has(tagName);
  const elId = t.identifier('_el$');
  const stmts: t.Statement[] = [];

  state.needsCreateNativeElement = true;
  const createArgs: t.Expression[] = [tag];
  if (isSVG) createArgs.push(t.booleanLiteral(true));
  stmts.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        elId,
        t.callExpression(t.identifier('createNativeElement'), createArgs),
      ),
    ]),
  );

  if (props.length > 0 || spreads.length > 0) {
    state.needsSpread = true;
    const spreadProps: t.ObjectProperty[] = [
      t.objectProperty(t.identifier('element'), elId),
      t.objectProperty(t.identifier('props'), buildPropsObject(props, spreads, state)),
    ];
    if (isSVG) {
      spreadProps.push(t.objectProperty(t.identifier('isSVG'), t.booleanLiteral(true)));
    }
    stmts.push(
      t.expressionStatement(
        t.callExpression(t.identifier('spread'), [t.objectExpression(spreadProps)]),
      ),
    );
  }

  // Insert each child individually (like the jsx runtime's applyProps), so a
  // reactive/component child that isn't the only child still gets its own
  // reactive binding. A single insert(el, [array]) does NOT bind function
  // elements sitting inside the array.
  if (children.length > 0) {
    state.needsInsert = true;
    for (const child of children) {
      const isFn =
        t.isArrowFunctionExpression(child) ||
        t.isFunctionExpression(child) ||
        (t.isCallExpression(child) &&
          t.isIdentifier(child.callee) &&
          child.callee.name === 'createMemo');
      const args: t.Expression[] = isFn
        ? [t.cloneNode(elId), child, t.nullLiteral()]
        : [t.cloneNode(elId), child];
      stmts.push(
        t.expressionStatement(t.callExpression(t.identifier('insert'), args)),
      );
    }
  }

  stmts.push(t.returnStatement(elId));
  return t.callExpression(
    t.arrowFunctionExpression([], t.blockStatement(stmts)),
    [],
  );
}

/**
 * Emit a component invocation. jsx backend: `jsx(Comp, props)`. Imperative:
 * `createMemo(() => createComponent(Comp, props))` — same shape jsx-runtime
 * produces for components, so it stays reactive when used as a child.
 */
function emitComponentCall(
  comp: t.Expression,
  propsObj: t.Expression,
  state: any,
): t.Expression {
  if (state.backend === 'imperative') {
    state.needsCreateComponent = true;
    state.needsCreateMemo = true;
    return t.callExpression(t.identifier('createMemo'), [
      t.arrowFunctionExpression(
        [],
        t.callExpression(t.identifier('createComponent'), [comp, propsObj]),
      ),
    ]);
  }
  return t.callExpression(t.identifier('jsx'), [comp, propsObj]);
}

/**
 * IR-pipeline path (codegen: 'ir'): build host-agnostic IR from the JSX node, run
 * the imperative backend's emit(), and reparse the emitted code into an AST
 * expression. Records the runtime symbols used so Program.exit can import them.
 * Produces the same runtime calls as the inline path — this is the route a future
 * swc front-end reuses.
 */
function emitViaIR(node: t.JSXElement | t.JSXFragment, state: any): t.Expression {
  // `used` collects runtime symbols emitted for JSX nested inside expressions
  // (render-props, ternaries, fallback={<p/>}, …) so we import them too.
  const used = new Set<string>();
  const ir = buildIR(node, used);
  const { code, imports } = imperativeBackend.emit(ir, {} as any);
  for (const s of imports) used.add(s);
  for (const s of used) state.irImports.add(s);
  return template.expression(code, { placeholderPattern: false })() as t.Expression;
}


//This method will convert props to lazy props like 
function lazyProps(properties: (t.ObjectProperty | t.ObjectMethod)[]) {
  return properties.map((prop) => {
    // Only transform normal properties (e.g., { open: variable })
    // Skip methods, spread elements, or already existing getters
    if (t.isObjectProperty(prop)) {
      // Handle potential computed properties (like {[someKey]: variable})
      const key = prop.key as any;
      const computed = prop.computed;
      const value = prop.value as any;

      // Create a getter method: get key() { return value; }
      return t.objectMethod(
        'get', // Kind of method
        key, // Property key
        [], // Getters take no arguments
        t.blockStatement([
          // Body: { return value; }
          t.returnStatement(value),
        ]),
        computed // Preserve computed status if true
      );
    }

    // Keep existing ObjectMethods (like get already there, or regular methods) as-is
    return prop;
  });
};

function transformAutomaticElement(
  element: t.JSXElement,
  state: any,
  development: boolean,
  autoShow = true,
): t.Expression {
  const openingElement = element.openingElement;
  const children = element.children;

  // Get element name/tag
  const tag = getElementName(openingElement.name);

  // Only auto-wrap reactive expressions for native HTML elements (lowercase tag).
  // Component props must NOT be wrapped — the component receives the value
  // as-is and is responsible for its own reactivity.
  const isNativeElement =
    t.isJSXIdentifier(openingElement.name) &&
    /^[a-z]/.test(openingElement.name.name);

  // Transform attributes to props object
  const attrs = transformAttributes(
    openingElement.attributes,
    state,
    isNativeElement,
    t.isJSXIdentifier(openingElement.name) ? openingElement.name.name : ''
  );
  let props = attrs.props;
  const spreads = attrs.spreads;

  // Component props become lazy getters so the component is created ONCE and reactivity flows
  // through the getter (a reactive `prop={sig()}` read eagerly would re-create the whole
  // component via the enclosing createMemo, so a <Portal> re-mounts and piles up). Static props
  // as getters are harmless. Native-element attrs must NOT be wrapped: they already carry their
  // own reactivity as `() => expr` thunks that `spread` consumes.
  if (!isNativeElement) props = lazyProps(props);

  // Transform children
  const transformedChildren = transformChildren(children, state, autoShow);

  // Imperative backend: emit direct runtime calls instead of jsx()/jsxs().
  if (state.backend === 'imperative') {
    return emitImperativeElement(
      tag,
      isNativeElement,
      props,
      spreads,
      transformedChildren,
      state,
    );
  }

  // Add children to props if any
  if (transformedChildren.length > 0) {
    const childrenProp =
      transformedChildren.length === 1
        ? transformedChildren[0]
        : t.arrayExpression(transformedChildren);

    props.push(t.objectProperty(t.identifier('children'), childrenProp));
  }

  // Build props object with spreads
  let propsObj: t.Expression;
  if (spreads.length > 0) {
    // Use mergeProps helper to preserve reactivity for store proxies
    const baseProps =
      props.length > 0 ? t.objectExpression(props) : t.objectExpression([]);

    // Import mergeProps from jsx-runtime if spreads are used
    state.needsMergeProps = true;

    propsObj = t.callExpression(t.identifier('mergeProps'), [
      ...spreads,
      baseProps,
    ]);
  } else {
    propsObj = t.objectExpression(props);
  }

  // Determine function name
  const functionName = development
    ? 'jsxDEV'
    : transformedChildren.length > 1
    ? 'jsxs'
    : 'jsx';

  // Build jsx call
  const args: t.Expression[] = [tag, propsObj];

  if (development) {
    // Add key, isStaticChildren, source, self for dev mode
    args.push(
      t.identifier('undefined'), // key
      t.booleanLiteral(false), // isStaticChildren
      t.identifier('undefined'), // source
      t.identifier('undefined') // self
    );
  }

  return t.callExpression(t.identifier(functionName), args);
}

function transformClassicElement(
  element: t.JSXElement,
  state: any,
  pragma: string
): t.CallExpression {
  const openingElement = element.openingElement;
  const children = element.children;

  const tag = getElementName(openingElement.name);
  const isNativeElement =
    t.isJSXIdentifier(openingElement.name) &&
    /^[a-z]/.test(openingElement.name.name);
  const { props, spreads } = transformAttributes(
    openingElement.attributes,
    state,
    isNativeElement,
    t.isJSXIdentifier(openingElement.name) ? openingElement.name.name : ''
  );
  const transformedChildren = transformChildren(children, state, state.autoShow ?? true);

  let propsObj: t.Expression;

  if (spreads.length > 0) {
    // Use mergeProps helper to preserve reactivity for store proxies
    // mergeProps(...spreads, baseProps) instead of Object.assign
    const baseProps =
      props.length > 0 ? t.objectExpression(props) : t.objectExpression([]);

    // Import mergeProps from jsx-runtime if spreads are used
    state.needsMergeProps = true;

    propsObj = t.callExpression(t.identifier('mergeProps'), [
      ...spreads,
      baseProps,
    ]);
  } else {
    propsObj = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();
  }

  const args: t.Expression[] = [tag, propsObj, ...transformedChildren];

  return t.callExpression(t.identifier(pragma), args);
}

function transformJSXFragment(
  fragment: t.JSXFragment,
  state: any,
  options: {
    runtime: 'automatic' | 'classic';
    pragmaFrag: string;
    development: boolean;
  }
): t.Expression {
  const { runtime, pragmaFrag, development } = options;

  const children = transformChildren(fragment.children, state, state.autoShow ?? true);

  // Imperative backend: a fragment is just its children; insert() flattens arrays.
  if (state.backend === 'imperative') {
    if (children.length === 0) return t.nullLiteral();
    return childrenValue(children);
  }

  if (runtime === 'automatic') {
    const functionName = development
      ? 'jsxDEV'
      : children.length > 1
      ? 'jsxs'
      : 'jsx';

    const props = t.objectExpression([
      t.objectProperty(
        t.identifier('children'),
        children.length === 1 ? children[0] : t.arrayExpression(children)
      ),
    ]);

    const args: t.Expression[] = [t.identifier('Fragment'), props];

    if (development) {
      args.push(
        t.identifier('undefined'),
        t.booleanLiteral(false),
        t.identifier('undefined'),
        t.identifier('undefined')
      );
    }

    return t.callExpression(t.identifier(functionName), args);
  } else {
    return t.callExpression(t.identifier(pragmaFrag), children);
  }
}

// ============================================================================
// Element Name Transformation
// ============================================================================

function getElementName(name: t.JSXOpeningElement['name']): t.Expression {
  if (t.isJSXIdentifier(name)) {
    const nameStr = name.name;

    // Check if it's a native element (lowercase)
    if (nameStr[0] === nameStr[0].toLowerCase()) {
      return t.stringLiteral(nameStr);
    }

    // Component reference
    return t.identifier(nameStr);
  }

  if (t.isJSXMemberExpression(name)) {
    return transformJSXMemberExpression(name);
  }

  if (t.isJSXNamespacedName(name)) {
    return t.stringLiteral(`${name.namespace.name}:${name.name.name}`);
  }

  return t.stringLiteral('div');
}

function transformJSXMemberExpression(
  expr: t.JSXMemberExpression
): t.MemberExpression {
  let object: t.Expression;

  if (t.isJSXIdentifier(expr.object)) {
    object = t.identifier(expr.object.name);
  } else {
    object = transformJSXMemberExpression(expr.object);
  }

  return t.memberExpression(object, t.identifier(expr.property.name));
}

// ============================================================================
// Attribute Transformation
// ============================================================================

/** Returns true when `name` can be used as an unquoted JS identifier. */
function isValidJSIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

function transformAttributes(
  attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  state: any,
  isNativeElement = true,
  tagName = ''
): { props: Array<t.ObjectProperty | t.ObjectMethod>; spreads: t.Expression[] } {
  const props: Array<t.ObjectProperty | t.ObjectMethod> = [];
  const spreads: t.Expression[] = [];
  const cfValueProp = CONTROL_FLOW_VALUE_PROPS[tagName];

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      // Collect spread expressions separately
      spreads.push(attr.argument as t.Expression);
    } else if (t.isJSXAttribute(attr)) {
      const name = getAttributeName(attr.name);
      const value = transformAttributeValue(attr.value, state, name, isNativeElement);

      // Detect event handlers for delegation
      if (EVENT_PROPS.test(name)) {
        const eventName = name.slice(2).toLowerCase();
        if (DELEGATABLE_EVENTS.includes(eventName)) {
          state.delegatedEvents.add(eventName);
        }
      }

      const key = isValidJSIdentifier(name)
        ? t.identifier(name)
        : t.stringLiteral(name);

      // Inline JSX passed to a COMPONENT prop (e.g. <Suspense fallback={<div/>}>) becomes a
      // LAZY getter — same as children. Otherwise it's an eager IIFE built when the props object
      // is constructed; during hydration that walks the hydration cursor and adopts the real
      // server node (a fallback `<div>` matches the content `<div>` by tag), duplicating the
      // tree. As a getter the node is only built when the component actually reads the prop.
      const raw = attr.value;
      const isInlineJsx =
        t.isJSXElement(raw) ||
        t.isJSXFragment(raw) ||
        (t.isJSXExpressionContainer(raw) &&
          (t.isJSXElement(raw.expression) || t.isJSXFragment(raw.expression)));
      // Control-flow reactive value prop (each/when/component/mount): emit as a getter so
      // reading it re-runs the caller's expression inside the component's tracking scope.
      const isCfValueProp = !isNativeElement && name === cfValueProp;
      // A reactive component prop (`prop={sig()}`, `prop={store.x}`) must be a getter, not an
      // eager value: eager reads the signal inside the enclosing `createMemo(() =>
      // createComponent(Comp, props))`, so the memo re-creates the WHOLE component on every
      // change (a <Portal> then re-mounts and piles up). As a getter the component is created
      // once and reactivity flows through the getter into the component's own effects.
      const rawExpr =
        t.isJSXExpressionContainer(raw) && !t.isJSXEmptyExpression(raw.expression)
          ? (raw.expression as t.Expression)
          : null;
      const isReactiveComponentProp =
        !isNativeElement && !!rawExpr && shouldAutoWrapAttrExpression(rawExpr, name);
      if ((!isNativeElement && isInlineJsx) || isCfValueProp || isReactiveComponentProp) {
        props.push(
          t.objectMethod('get', key, [], t.blockStatement([t.returnStatement(value)])),
        );
      } else {
        props.push(t.objectProperty(key, value));
      }
    }
  }

  return { props, spreads };
}

function getAttributeName(name: t.JSXAttribute['name']): string {
  if (t.isJSXIdentifier(name)) {
    return name.name === 'class' ? 'className' : name.name;
  }

  if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`;
  }

  return 'unknown';
}

function transformAttributeValue(
  value: t.JSXAttribute['value'],
  state: any,
  attrName: string = '',
  isNativeElement = true
): t.Expression {
  if (value === null) {
    return t.booleanLiteral(true);
  }

  if (t.isStringLiteral(value)) {
    // JSX allows string attribute values to span multiple lines, but JS string
    // literals cannot contain raw newlines. When multi-line, normalise: collapse
    // any run of whitespace (including newlines) to a single space and trim.
    // We create a *new* StringLiteral so Babel discards the original extra.raw
    // (which still contains the literal newlines) and generates a clean literal.
    if (value.value.includes('\n')) {
      return t.stringLiteral(value.value.replace(/\s+/g, ' ').trim());
    }
    return value;
  }

  if (t.isJSXExpressionContainer(value)) {
    if (t.isJSXEmptyExpression(value.expression)) {
      return t.booleanLiteral(true);
    }

    const expr = value.expression as t.Expression;

    // Auto-wrap reactive expressions so DOM attribute reads happen inside effects.
    // Only applies to native HTML elements — component props must NOT be wrapped
    // because the component receives the value directly and calling it would give
    // () => value instead of value.
    if (isNativeElement && shouldAutoWrapAttrExpression(expr, attrName)) {
      return t.arrowFunctionExpression([], expr);
    }

    return expr;
  }

  if (t.isJSXElement(value)) {
    return transformAutomaticElement(value, state, false, state.autoShow ?? true);
  }

  if (t.isJSXFragment(value)) {
    return transformJSXFragment(value, state, {
      runtime: 'automatic',
      pragmaFrag: 'Fragment',
      development: false,
    });
  }

  return t.booleanLiteral(true);
}

/**
 * Decide whether a JSX attribute value expression should be auto-wrapped
 * in `() => expr` for fine-grained reactivity (SolidJS style).
 */
function shouldAutoWrapAttrExpression(
  expr: t.Expression,
  attrName: string
): boolean {
  // Event handlers must NOT be wrapped — they are called by the runtime.
  // Covers both camelCase (onClick) and namespaced (on:click) forms.
  if (EVENT_PROPS.test(attrName) || attrName.startsWith('on:')) {
    return false;
  }

  // ref receives the DOM element directly — never wrap.
  if (attrName === 'ref') {
    return false;
  }

  // use:Directive — the directive itself decides how to handle the value.
  if (attrName.startsWith('use:')) {
    return false;
  }

  // Already an arrow function or function expression — already reactive.
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
    return false;
  }

  // Plain identifier — may itself be a signal accessor/function; let runtime handle it.
  if (t.isIdentifier(expr)) {
    return false;
  }

  // Static literals need no wrapping.
  if (
    t.isStringLiteral(expr) ||
    t.isNumericLiteral(expr) ||
    t.isBooleanLiteral(expr) ||
    t.isNullLiteral(expr)
  ) {
    return false;
  }

  // Call expressions: signal(), count(), store.method()
  if (t.isCallExpression(expr) || t.isOptionalCallExpression(expr)) {
    return true;
  }

  // Member expressions: store.prop, obj.value
  if (t.isMemberExpression(expr) || t.isOptionalMemberExpression(expr)) {
    return true;
  }

  // Compound expressions that may contain reactive reads.
  if (
    t.isLogicalExpression(expr) ||
    t.isConditionalExpression(expr) ||
    t.isBinaryExpression(expr) ||
    t.isUnaryExpression(expr)
  ) {
    return true;
  }

  // Template literals: `Hello ${name()}`
  if (t.isTemplateLiteral(expr)) {
    return true;
  }

  // Object expressions: classList={{ active: isActive() }}
  if (t.isObjectExpression(expr)) {
    return true;
  }

  // Array expressions: style={[baseStyle, dynamicStyle()]}
  if (t.isArrayExpression(expr)) {
    return true;
  }

  return false;
}

// ============================================================================
// Children Transformation
// ============================================================================

/**
 * Canonical JSX text cleaning (matches babel/React/Solid): trim line-boundary
 * whitespace, collapse runs to single spaces, and drop text that is only
 * whitespace spanning a newline. Returns '' when the node is insignificant.
 */
function cleanJSXText(value: string): string {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
  }
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i !== 0) line = line.replace(/^ +/, '');
    if (i !== lines.length - 1) line = line.replace(/ +$/, '');
    if (!line) continue;
    if (i !== lastNonEmpty) line += ' ';
    out += line;
  }
  return out;
}

function transformChildren(
  children: Array<
    | t.JSXText
    | t.JSXExpressionContainer
    | t.JSXSpreadChild
    | t.JSXElement
    | t.JSXFragment
  >,
  state: any,
  autoShow = true,
): t.Expression[] {
  const result: t.Expression[] = [];

  for (const child of children) {
    if (t.isJSXText(child)) {
      // Canonical JSX whitespace handling (as React/Solid): whitespace-only text
      // that spans a line break is insignificant and dropped; inline runs collapse
      // to a single space. This matters beyond cosmetics — keeping a `" "` text
      // node next to a child turns `props.children` into an ARRAY, and an array
      // insert doesn't reactively bind a memo/component sitting inside it (so a
      // nested lazy/<Suspense> never updates). Dropping the stray whitespace keeps
      // a lone child a lone child, so insert binds it reactively.
      const text = cleanJSXText(child.value);
      if (text) result.push(t.stringLiteral(text));
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        const expr = child.expression as t.Expression;

        // Auto-transform patterns into jsx(Show, ...) so JSX subtrees are
        // created once and never recreated on every signal change.
        //
        // Handled patterns:
        //   () => cond && <JSX />                — arrow logical
        //   () => cond ? <JSX /> : fallback       — arrow ternary
        //   cond && <JSX />                       — bare logical
        //   cond ? <JSX /> : fallback             — bare ternary
        if (autoShow) {
          const showNode =
            tryTransformArrowToShow(expr, state) ??
            tryTransformRawToShow(expr, state);
          if (showNode) {
            result.push(showNode);
            continue;
          }
        } else {
          // autoShow off: wrap JSX conditional expressions in createMemo(() => expr)
          // so the condition is still evaluated reactively without recreating the tree.
          const memoNode = tryWrapConditionalAsMemo(expr, state);
          if (memoNode) {
            result.push(memoNode);
            continue;
          }
        }

        // Auto-wrap reactive expressions for SolidJS-style reactivity
        if (shouldAutoWrapExpression(expr)) {
          result.push(t.arrowFunctionExpression([], expr));
        } else {
          result.push(expr);
        }
      }
    } else if (t.isJSXElement(child)) {
      result.push(transformAutomaticElement(child, state, false, state.autoShow ?? true));
    } else if (t.isJSXFragment(child)) {
      result.push(
        transformJSXFragment(child, state, {
          runtime: 'automatic',
          pragmaFrag: 'Fragment',
          development: false,
        })
      );
    } else if (t.isJSXSpreadChild(child)) {
      result.push(child.expression as t.Expression);
    }
  }

  return result;
}

// ============================================================================
// Auto-Show Transform
// ============================================================================

/**
 * Detects the patterns:
 *   () => condition && <JSX />
 *   () => condition ? <JSX /> : null
 *   () => condition ? <JSX /> : <Fallback />
 *
 * and rewrites them to:
 *   jsx(Show, { when: () => condition, children: jsx(...), fallback? })
 *
 * This prevents the JSX subtree from being recreated on every reactive update.
 * Show's memo only re-evaluates when the boolean result of `condition` changes.
 */
function tryTransformArrowToShow(
  expr: t.Expression,
  state: any,
): t.Expression | null {
  if (
    !t.isArrowFunctionExpression(expr) ||
    expr.params.length !== 0 ||
    expr.async
  ) {
    return null;
  }

  const body = expr.body as t.Expression;

  // Pattern 1: () => condition && <JSX />   (or () => condition && (() => <JSX />))
  if (
    t.isLogicalExpression(body) &&
    body.operator === '&&'
  ) {
    const jsx = getJSXContent(body.right as t.Expression);
    if (jsx) {
      return buildShowCall(
        unwrapZeroArgArrow(body.left as t.Expression),
        jsx,
        null,
        state,
      );
    }
  }

  // Pattern 2: () => condition ? <JSX /> : null | undefined | false
  // Pattern 3: () => condition ? <JSX /> : <Fallback />
  // Pattern 4: () => condition ? <JSX /> : otherCond ? <JSX2 /> : <Fallback /> (nested ternary)
  if (t.isConditionalExpression(body)) {
    const jsx = getJSXContent(body.consequent as t.Expression);
    if (jsx) {
      const fallback = buildFallback(body.alternate as t.Expression, state);
      return buildShowCall(
        unwrapZeroArgArrow(body.test),
        jsx,
        fallback,
        state,
        true
      );
    }
  }

  return null;
}

/**
 * Handles bare (non-arrow-wrapped) ternary and logical JSX expressions:
 *
 *   cond && <JSX />
 *   cond ? <JSX /> : fallback
 *
 * These are transformed to `jsx(Show, { when: () => cond, ... })` exactly like
 * their arrow-wrapped counterparts, preventing JSX subtrees from being
 * recreated on every reactive update.
 */
function tryTransformRawToShow(
  expr: t.Expression,
  state: any,
): t.Expression | null {
  // cond && <JSX />   (or cond && (() => <JSX />))
  if (t.isLogicalExpression(expr) && expr.operator === '&&') {
    const jsx = getJSXContent(expr.right as t.Expression);
    if (jsx) {
      return buildShowCall(
        unwrapZeroArgArrow(expr.left as t.Expression),
        jsx,
        null,
        state,
      );
    }
  }

  // cond ? <JSX /> : fallback   (consequent may be () => <JSX />)
  // test may be (() => expr) — unwrap to avoid double arrow wrapping
  if (t.isConditionalExpression(expr)) {
    const jsx = getJSXContent(expr.consequent as t.Expression);
    if (jsx) {
      const fallback = buildFallback(expr.alternate as t.Expression, state);
      return buildShowCall(
        unwrapZeroArgArrow(expr.test),
        jsx,
        fallback,
        state,
      );
    }
  }

  return null;
}

/**
 * When autoShow is disabled, wraps ALL ternary and logical-AND expressions in
 * `createMemo(() => normalizedExpr)` so the condition evaluates reactively and
 * the result is cached (not re-evaluated on every render cycle).
 *
 * Normalization rules applied before wrapping:
 *   - Outer zero-arg arrow unwrapped:  `() => cond ? a : b` → body used directly
 *   - Arrow-wrapped test unwrapped:    `(() => cond) ? a : b` → `cond ? a : b`
 *   - Arrow-wrapped JSX consequent:    `() => <JSX>` → `<JSX>` (so Babel transforms it)
 *   - Arrow-wrapped JSX alternate:     `() => <JSX>` → `<JSX>` likewise
 *   - Non-JSX branches left as-is:     strings, identifiers, call results, etc.
 *
 * Examples:
 *   {cond ? "a" : "b"}                →  createMemo(() => cond ? "a" : "b")
 *   {cond ? <A/> : <B/>}              →  createMemo(() => cond ? <A/> : <B/>)
 *   {(() => cond) ? ()=><A/> : <B/>}  →  createMemo(() => cond ? <A/> : <B/>)
 *   {cond && <A/>}                    →  createMemo(() => cond && <A/>)
 */
function tryWrapConditionalAsMemo(
  expr: t.Expression,
  state: any,
): t.Expression | null {
  // Unwrap outer zero-arg arrow: () => <inner> → work on inner directly
  const inner: t.Expression =
    t.isArrowFunctionExpression(expr) &&
    expr.params.length === 0 &&
    !expr.async &&
    t.isExpression(expr.body)
      ? (expr.body as t.Expression)
      : expr;

  if (t.isConditionalExpression(inner)) {
    // Unwrap arrow-wrapped test to prevent always-truthy condition
    const normalizedTest = unwrapZeroArgArrow(inner.test);
    // Unwrap arrow-wrapped JSX branches so Babel can transform them;
    // non-JSX branches (strings, calls, etc.) are kept as-is
    const consequentJsx = getJSXContent(inner.consequent as t.Expression);
    const normalizedConsequent = consequentJsx ?? (inner.consequent as t.Expression);
    const altJsx = getJSXContent(inner.alternate as t.Expression);
    const normalizedAlternate = altJsx ?? (inner.alternate as t.Expression);

    const normalized = t.conditionalExpression(
      normalizedTest,
      normalizedConsequent,
      normalizedAlternate,
    );

    // If either branch is a control-flow component (For, Switch, Index, Show, …),
    // do NOT wrap in createMemo — return null so the caller falls through to the
    // plain `() => expr` path via shouldAutoWrapExpression.
    if (
      isControlFlowJSX(inner.consequent as t.Expression) ||
      isControlFlowJSX(inner.alternate as t.Expression)
    ) {
      return null;
    }

    state.needsCreateMemo = true;
    return t.callExpression(t.identifier('createMemo'), [
      t.arrowFunctionExpression([], normalized),
    ]);
  }

  if (t.isLogicalExpression(inner) && inner.operator === '&&') {
    const normalizedLeft = unwrapZeroArgArrow(inner.left as t.Expression);
    const rightJsx = getJSXContent(inner.right as t.Expression);
    const normalizedRight = rightJsx ?? (inner.right as t.Expression);

    const normalized = t.logicalExpression('&&', normalizedLeft, normalizedRight);

    // Same guard for logical && (e.g. {show && <For ...>})
    if (isControlFlowJSX(inner.right as t.Expression)) {
      return null;
    }

    state.needsCreateMemo = true;
    return t.callExpression(t.identifier('createMemo'), [
      t.arrowFunctionExpression([], normalized),
    ]);
  }

  return null;
}

/**
 * Recursively transforms a fallback expression into a reactive value.
 * If the expression is a nested ternary `cond ? <JSX /> : rest`, it is
 * transformed into a nested `Show` call so the condition is tracked reactively.
 */
function buildFallback(expr: t.Expression, state: any): t.Expression | null {
  if (isFalsyNode(expr)) return null;
  // bare JSX or () => <JSX>
  const directJsx = getJSXContent(expr);
  if (directJsx) {
    return transformJSXNode(directJsx, state);
  }
  // Nested ternary whose truthy branch is JSX (or arrow-wrapped JSX)
  if (t.isConditionalExpression(expr)) {
    const inner = expr as t.ConditionalExpression;
    const innerJsx = getJSXContent(inner.consequent as t.Expression);
    if (innerJsx) {
      const nestedFallback = buildFallback(inner.alternate as t.Expression, state);
      return buildShowCall(
        unwrapZeroArgArrow(inner.test),
        innerJsx,
        nestedFallback,
        state,
      );
    }
  }
  return expr;
}

function isJSXNode(node: t.Node): node is t.JSXElement | t.JSXFragment {
  return t.isJSXElement(node) || t.isJSXFragment(node);
}

/**
 * Returns true when `expr` (or a zero-arg arrow wrapping it) is a JSXElement
 * whose tag is one of the Fluixi control-flow components (For, Switch, Index,
 * Show, Portal, Dynamic, ErrorBoundary, Suspense).  These must NOT be wrapped in
 * createMemo — a plain `() => expr` arrow is sufficient and avoids double-tracking.
 */
function isControlFlowJSX(expr: t.Expression): boolean {
  const jsx = getJSXContent(expr);
  if (!jsx || !t.isJSXElement(jsx)) return false;
  const name = jsx.openingElement.name;
  return t.isJSXIdentifier(name) && CONTROL_FLOW_COMPONENTS.has(name.name);
}

/**
 * Returns the JSX content from either bare `<JSX>` or a zero-arg arrow `() => <JSX>`.
 * This allows Show transformation to work regardless of whether the author wrapped the
 * consequent/alternate in an arrow function or not.
 */
function getJSXContent(expr: t.Expression): t.JSXElement | t.JSXFragment | null {
  if (isJSXNode(expr)) return expr as t.JSXElement | t.JSXFragment;
  if (
    t.isArrowFunctionExpression(expr) &&
    expr.params.length === 0 &&
    !expr.async &&
    isJSXNode(expr.body as t.Node)
  ) {
    return expr.body as t.JSXElement | t.JSXFragment;
  }
  return null;
}

/**
 * Unwraps a zero-argument arrow `() => expr` to `expr`.
 * Used to avoid double-wrapping when the test/condition is already `() => cond`.
 * `buildShowCall` always wraps the condition in `() =>`, so passing a bare expr
 * produces `() => cond`; passing `() => cond` without unwrapping produces `() => () => cond`
 * which is always truthy.
 */
function unwrapZeroArgArrow(expr: t.Expression): t.Expression {
  if (
    t.isArrowFunctionExpression(expr) &&
    expr.params.length === 0 &&
    !expr.async &&
    t.isExpression(expr.body)
  ) {
    return expr.body as t.Expression;
  }
  return expr;
}

function isFalsyNode(node: t.Node): boolean {
  return (
    t.isNullLiteral(node) ||
    (t.isIdentifier(node) && node.name === 'undefined') ||
    (t.isBooleanLiteral(node) && node.value === false)
  );
}

function transformJSXNode(
  node: t.JSXElement | t.JSXFragment,
  state: any,
): t.Expression {
  if (t.isJSXElement(node)) {
    return transformAutomaticElement(node, state, false, state.autoShow ?? true);
  }
  return transformJSXFragment(node, state, {
    runtime: 'automatic',
    pragmaFrag: 'Fragment',
    development: false,
  });
}

function buildShowCall(
  condition: t.Expression,
  children: t.JSXElement | t.JSXFragment,
  fallback: t.Expression | null,
  state: any,
  fromArrow: boolean = false
): t.CallExpression {
  // Register Show so it gets auto-imported if needed
  state.controlFlowComponents.add('Show');
  state.needsControlFlowImport = true;

  const transformedChildren = transformJSXNode(children, state);
  // console.log('build show call', generate(condition).code);
  const props: t.ObjectProperty[] = [
    t.objectProperty(
      t.identifier('when'),
      t.arrowFunctionExpression([], condition)
      // fromArrow ? (condition) : t.arrowFunctionExpression([], condition),
    ),
    t.objectProperty(t.identifier('children'), transformedChildren),
  ];

  if (fallback) {
    props.push(t.objectProperty(t.identifier('fallback'), fallback));
  }

  return emitComponentCall(
    t.identifier('Show'),
    t.objectExpression(props),
    state,
  ) as t.CallExpression;
}

// ============================================================================
// Reactivity Detection
// ============================================================================

/**
 * Check if an expression should be auto-wrapped in an arrow function for reactivity
 * This enables SolidJS-style reactivity where you can write {store.property} or {signal()}
 * without manual wrapping
 */
function shouldAutoWrapExpression(expr: t.Expression): boolean {
  // Member expressions: store.property, user.name, etc.
  // These need wrapping so property access happens inside an effect
  if (t.isMemberExpression(expr) || t.isOptionalMemberExpression(expr)) {
    // `props.children` (any `.children`) is a stable subtree reference, not a
    // reactive value. Wrapping it in `() => props.children` adds an insert layer
    // that fully unwraps the children's Suspense/memo to a static node, severing
    // the reactive binding — so a nested lazy/<Suspense> that resolves later
    // never propagates up through the component-children hop. Pass it through
    // non-reactive (insert(el, props.children)) so insert binds to the child's
    // own memo, exactly like a directly-rendered <Outlet/>.
    if (!expr.computed && t.isIdentifier(expr.property, { name: 'children' })) {
      return false;
    }
    return true;
  }

  // Call expressions: signal(), count(), etc.
  // These are already function calls but need wrapping to re-run on updates
  if (t.isCallExpression(expr) || t.isOptionalCallExpression(expr)) {
    return true;
  }

  // DON'T wrap plain identifiers - they might be signal accessors or functions
  // that should be passed as-is. Only wrap when accessing properties or calling.
  if (t.isIdentifier(expr)) {
    return false;
  }

  // Logical expressions: signal() && other, store.value || default
  if (t.isLogicalExpression(expr) || t.isConditionalExpression(expr)) {
    return true;
  }

  // Binary expressions: signal() + 1, store.count * 2
  if (t.isBinaryExpression(expr)) {
    return true;
  }

  // Unary expressions: !signal(), -store.count
  if (t.isUnaryExpression(expr)) {
    return true;
  }

  // Template literals: `Count: ${count()}`
  if (t.isTemplateLiteral(expr)) {
    return true;
  }

  // Don't wrap literals, strings, numbers, etc.
  return false;
}

// ============================================================================
// Static Optimization
// ============================================================================

function shouldWrapReactive(expr: t.Expression, state: any): boolean {
  // Call expressions ending with () - likely signal accessors
  if (t.isCallExpression(expr) && t.isIdentifier(expr.callee)) {
    return true;
  }

  // Arrow functions with no parameters - could be computed values
  if (t.isArrowFunctionExpression(expr) && expr.params.length === 0) {
    return true;
  }

  // Function expressions with no parameters
  if (t.isFunctionExpression(expr) && expr.params.length === 0) {
    return true;
  }

  // Member expressions - could be store access
  if (t.isMemberExpression(expr)) {
    return true;
  }

  return false;
}

function wrapReactiveExpression(expr: t.Expression): t.CallExpression {
  return t.callExpression(t.identifier(''), [
    t.arrowFunctionExpression([], expr),
  ]);
}

// ============================================================================
// Static Element Optimization
// ============================================================================

function isStaticElement(element: t.JSXElement, state: any): boolean {
  const openingElement = element.openingElement;

  // Check if tag is static (string literal)
  if (!t.isJSXIdentifier(openingElement.name)) {
    return false;
  }

  const tagName = openingElement.name.name;
  if (tagName[0] !== tagName[0].toLowerCase()) {
    // Component, not a native element
    return false;
  }

  // Check if all attributes are static
  for (const attr of openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      return false;
    }

    if (t.isJSXAttribute(attr)) {
      const value = attr.value;

      if (t.isJSXExpressionContainer(value)) {
        if (
          !t.isStringLiteral(value.expression) &&
          !t.isNumericLiteral(value.expression)
        ) {
          return false;
        }
      }
    }
  }

  // Check if all children are static
  for (const child of element.children) {
    if (t.isJSXElement(child) && !isStaticElement(child, state)) {
      return false;
    }

    if (t.isJSXExpressionContainer(child)) {
      return false;
    }
  }

  return true;
}

function hoistStaticElement(
  element: t.JSXElement,
  state: any
): t.Identifier | null {
  const varName = `_$static${state.staticCounter++}`;
  const transformed = transformAutomaticElement(element, state, false);

  state.staticElements.set(varName, transformed);

  return t.identifier(varName);
}

// ============================================================================
// Control Flow Optimization
// ============================================================================

function optimizeControlFlowComponent(
  element: t.JSXElement,
  state: any
): t.Expression | null {
  const componentName = (element.openingElement.name as t.JSXIdentifier).name;

  // Optimize Show component
  if (componentName === 'Show') {
    return optimizeShowComponent(element, state);
  }

  // Optimize For component
  if (componentName === 'For') {
    return optimizeForComponent(element, state);
  }

  return null;
}

function optimizeShowComponent(
  element: t.JSXElement,
  state: any
): t.Expression | null {
  // Extract when, fallback, and children
  // Apply optimizations based on patterns
  return null; // Placeholder for optimization logic
}

function optimizeForComponent(
  element: t.JSXElement,
  state: any
): t.Expression | null {
  // Extract each and children
  // Apply keyed reconciliation optimizations
  return null; // Placeholder for optimization logic
}

// ============================================================================
// Exports
// ============================================================================
