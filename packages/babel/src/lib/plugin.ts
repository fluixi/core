/**
 * @fileoverview Comprehensive Babel Plugin for Reactive JSX Transformation
 * @module @awc/babel-plugin-jsx
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
  type PluginObj,
  type PluginPass,
} from '@babel/core';

// ============================================================================
// Types
// ============================================================================

export interface PluginOptions {
  /**
   * JSX runtime mode
   * @default 'automatic'
   */
  runtime?: 'automatic' | 'classic';

  /**
   * Import source for JSX runtime
   * @default '@awc/jsx-runtime'
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
   * @default '@awc/dom'
   */
  signalModule?: string;

  /**
   * Module name for control flow
   * @default '@awc/dom'
   */
  controlFlowModule?: string;
}

interface PluginStateData {
  hasJSX: boolean;
  hasReactivity: boolean;
  hasLitHTML: boolean;
  needsSignalImport: boolean;
  needsControlFlowImport: boolean;
  controlFlowComponents: Set<string>;
  delegatedEvents: Set<string>;
  staticElements: Map<string, t.Expression>;
  staticCounter: number;
  libModule: string;
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
    importSource = '@kettlejs/jsx-runtime',
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
    signalModule = '@awc/dom',
    controlFlowModule = '@awc/dom',
  } = options;

  const pluginState: PluginStateData = {
    libModule: '@awc/kettlejs',
    hasJSX: false,
    hasReactivity: false,
    hasLitHTML: false,
    needsSignalImport: false,
    needsControlFlowImport: false,
    controlFlowComponents: new Set(),
    delegatedEvents: new Set(),
    staticElements: new Map(),
    staticCounter: 0,
  };

  return {
    name: '@awc/babel-plugin-jsx',

    manipulateOptions(opts, parserOpts) {
      // Enable JSX parsing
      parserOpts.plugins.push('jsx', 'typescript');
    },

    pre(state) {
      // Initialize plugin state
      Object.assign(state, pluginState);
    },

    visitor: {
      // Map @awc/kettlejs/rx imports to @awc/reactive for client-side code
      ImportDeclaration(path, state: any) {
        const source = path.node.source.value;

        // Map @awc/kettlejs/rx to @awc/reactive (client-side reactive primitives)
        if (source === '@awc/kettlejs/rx') {
          path.node.source = t.stringLiteral('@awc/reactive');
        }

        // Also handle kettlejs server imports - keep as is for SSR
        // @awc/kettlejs/server stays as is (includes server reactive mappings)
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
            controlFlowComponents: new Set(),
            delegatedEvents: new Set(),
            staticElements: new Map(),
            staticCounter: 0,
            libModule: '@awc/kettlejs',
          });
        },

        exit(path, state: any) {
          const imports: t.ImportDeclaration[] = [];
          if (!state.hasJSX) {
            if (state.needsLitrxImport) {
              console.log('state', {
                jsx: state.hasJSX,
                need: state.needsLitrxImport,
                binding: !path.scope.hasBinding('litrx'),
              });
            }
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
            // Add JSX runtime imports
            if (runtime === 'automatic') {
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

            // Add control flow imports if needed
            if (
              state.needsControlFlowImport &&
              state.controlFlowComponents.size > 0
            ) {
              const specifiers = (
                Array.from(state.controlFlowComponents) as string[]
              ).map((name) =>
                t.importSpecifier(t.identifier(name), t.identifier(name))
              );
              imports.push(
                t.importDeclaration(
                  specifiers,
                  t.stringLiteral(controlFlowModule)
                )
              );
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
                  t.stringLiteral('@awc/jsx-runtime')
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
        console.log('jsx visitor');
        state.hasJSX = true;

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

        // Try to hoist static elements
        if (hoistStatics && isStaticElement(element, state)) {
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
        });

        path.replaceWith(transformed);
      },

      JSXFragment(path, state: any) {
        console.log('jsx fragment babel');
        state.hasJSX = true;

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
      JSXExpressionContainer(path) {
        const expression = path.get('expression');
        const node = expression.node;

        // Skip if it's already wrapped or empty
        if (t.isJSXEmptyExpression(node)) return;

        let shouldWrap = false;
        let newNode: t.Expression = node as t.Expression;

        // 1. Handle Member Expressions (e.g., theme.$color)
        if (t.isMemberExpression(node) && t.isIdentifier(node.property)) {
          if (node.property.name.startsWith('$')) {
            shouldWrap = true;
            this.needsWatchImport = true;

            // Strip the $ for the runtime Proxy
            newNode = t.memberExpression(
              node.object,
              t.identifier(node.property.name.replace('$', ''))
            );
          }
        }

        // 2. Handle Signal/Function Calls (e.g., count())
        if (t.isCallExpression(node)) {
          shouldWrap = true;
          this.needsWatchImport = true;
        }
        // console.log('is call exp', node.loc)

        if (shouldWrap) {
          // Wrap the expression: { watch(() => expression) }
          expression.replaceWith(
            t.callExpression(t.identifier('watch'), [
              t.arrowFunctionExpression([], newNode),
            ])
          );
        }
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
                // t.identifier('(window as any).KettleJS.litrx')
                t.callExpression(
                  t.identifier('((window as any).KettleJS.litrx || litrx)'),
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
  }
): t.Expression {
  const { runtime, pragma, development } = options;

  if (runtime === 'automatic') {
    return transformAutomaticElement(element, state, development);
  } else {
    return transformClassicElement(element, state, pragma);
  }
}

function transformAutomaticElement(
  element: t.JSXElement,
  state: any,
  development: boolean
): t.CallExpression {
  const openingElement = element.openingElement;
  const children = element.children;

  // Get element name/tag
  const tag = getElementName(openingElement.name);

  // Transform attributes to props object
  const { props, spreads } = transformAttributes(
    openingElement.attributes,
    state
  );

  // Transform children
  const transformedChildren = transformChildren(children, state);

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
  const { props, spreads } = transformAttributes(
    openingElement.attributes,
    state
  );
  const transformedChildren = transformChildren(children, state);

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

  const children = transformChildren(fragment.children, state);

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

function transformAttributes(
  attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  state: any
): { props: t.ObjectProperty[]; spreads: t.Expression[] } {
  const props: t.ObjectProperty[] = [];
  const spreads: t.Expression[] = [];

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      // Collect spread expressions separately
      spreads.push(attr.argument as t.Expression);
    } else if (t.isJSXAttribute(attr)) {
      const name = getAttributeName(attr.name);
      const value = transformAttributeValue(attr.value, state);

      // Detect event handlers for delegation
      if (EVENT_PROPS.test(name)) {
        const eventName = name.slice(2).toLowerCase();
        if (DELEGATABLE_EVENTS.includes(eventName)) {
          state.delegatedEvents.add(eventName);
        }
      }

      props.push(t.objectProperty(t.identifier(name), value));
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
  state: any
): t.Expression {
  if (value === null) {
    return t.booleanLiteral(true);
  }

  if (t.isStringLiteral(value)) {
    return value;
  }

  if (t.isJSXExpressionContainer(value)) {
    if (t.isJSXEmptyExpression(value.expression)) {
      return t.booleanLiteral(true);
    }

    const expr = value.expression as t.Expression;
    // if (shouldWrapReactive(expr, state)) {
    //   state.needsSignalImport = true;
    //   return wrapReactiveExpression(expr);
    // }

    // DON'T auto-wrap expressions in attributes - they're passed as-is to props
    // Signal accessors and store proxies work correctly when passed as props
    // Only children expressions need wrapping for display
    return expr;
  }

  if (t.isJSXElement(value)) {
    return transformAutomaticElement(value, state, false);
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

// ============================================================================
// Children Transformation
// ============================================================================

function transformChildren(
  children: Array<
    | t.JSXText
    | t.JSXExpressionContainer
    | t.JSXSpreadChild
    | t.JSXElement
    | t.JSXFragment
  >,
  state: any
): t.Expression[] {
  const result: t.Expression[] = [];

  for (const child of children) {
    if (t.isJSXText(child)) {
      // Preserve whitespace between elements, but normalize line breaks
      const text = child.value.replace(/\s+/g, ' ');
      // Only skip completely empty text nodes
      if (text && text !== ' ') {
        result.push(t.stringLiteral(text));
      } else if (text === ' ' && result.length > 0) {
        // Preserve single space between expressions
        result.push(t.stringLiteral(' '));
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        const expr = child.expression as t.Expression;

        // Auto-wrap reactive expressions for SolidJS-style reactivity
        // Wrap member expressions (store.property), call expressions (signal()), etc.
        if (shouldAutoWrapExpression(expr)) {
          result.push(t.arrowFunctionExpression([], expr));
        } else {
          result.push(expr);
        }
        // if (shouldWrapReactive(expr, state)) {
        //   state.needsSignalImport = true;
        //   result.push(wrapReactiveExpression(expr));
        // } else {
        //   result.push(expr);
        // }
      }
    } else if (t.isJSXElement(child)) {
      result.push(transformAutomaticElement(child, state, false));
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
