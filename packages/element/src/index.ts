export { defineElement } from './lib/define-element.js';
export { wrapElement } from './lib/wrap-element.js';
export { createComponent } from './lib/create-component.js';
export type { CreateComponentConfig, ComponentProps, EventsMap, EventName } from './lib/create-component.js';
export { withPortal, withSubComponents } from './lib/with-portal.js';
export { KettleElement } from './lib/kettle-element.js';
export { KettleLitElement } from './lib/kettle-lit-element.js';
export { KettleController } from './lib/controller.js';
// kettleElementPlugin is NOT exported here (Node.js build tool).
// Import it from '@fluixi/element/plugin' in vite.config.ts instead.
export type {
  DefineElementOptions,
  PropDefinition,
  PropTypeConstructor,
  InferPropType,
  SignalTuple,
  PropsSignals,
  ElementRenderFn,
  ElementAttributes,
  EventDefinition,
  ElementEventHandlers,
  ElementRenderContext,
  TypedKettleElement,
  KettleElementConstructor,
  KettleElementInstance,
  KettleElementJSXAttributes,
  KettleHTMLAttributes,
  PropToAttribute,
  CamelToKebab,
  ElementLifecycleCallbacks,
} from '@fluixi/dom/element';
