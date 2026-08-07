export * from './lib/index.js';

// Namespace for `import DOM from '@fluixi/dom'` — just the rendering runtime.
// Guards/read-only helpers are named exports only. Plain literal so it drops when
// unused.
import {
  createComponent,
  createElement,
  createNativeElement,
  createTemplate,
  cloneTemplate,
  templateNode,
  holeContent,
  holeEnd,
  holeScope,
  createPortal,
  render,
  hydrate,
  insert,
  appendChildren,
  removeChildren,
  spread,
  applyProps,
  mergeProps,
  setProperty,
  setDynamicProperty,
  setAttribute,
  setDynamicAttribute,
  removeAttribute,
  getAttribute,
  setClassName,
  addClass,
  removeClass,
  toggleClass,
  setStyles,
  delegateEvents,
  addDelegatedEventListener,
  removeDelegatedEventListener,
  handleRef,
  resetIntegration,
  isIntegrationInitialized,
} from './lib/index.js';

const DOM = {
  createComponent,
  createElement,
  createNativeElement,
  createTemplate,
  cloneTemplate,
  templateNode,
  holeContent,
  holeEnd,
  holeScope,
  createPortal,
  render,
  hydrate,
  insert,
  appendChildren,
  removeChildren,
  spread,
  applyProps,
  mergeProps,
  setProperty,
  setDynamicProperty,
  setAttribute,
  setDynamicAttribute,
  removeAttribute,
  getAttribute,
  setClassName,
  addClass,
  removeClass,
  toggleClass,
  setStyles,
  delegateEvents,
  addDelegatedEventListener,
  removeDelegatedEventListener,
  handleRef,
  resetIntegration,
  isIntegrationInitialized,
};

export { VERSION } from './version.generated.js';
// Version stamping lives here, not in core, so the hydrate path stamps too — core sits
// above this package and registers its own version rather than being imported.
export {
  registerCoreVersion,
  stampVersions,
  warnOnVersionSkew,
  versions,
  type FluixiVersions,
} from './lib/dom/versions.js';

export type DOM = typeof DOM;
export default DOM;
