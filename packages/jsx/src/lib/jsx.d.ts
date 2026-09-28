/**
 * @fileoverview JSX Type Definitions for Fluixi
 * @module @fluixi/core/jsx-runtime
 */


import type { Accessor } from '@fluixi/reactive/signal';

// Element attribute types live in @fluixi/dom: they describe the DOM, not JSX
// syntax, so html`` tooling can read them without depending on this package.
// Re-exported here so `JSX.HTMLAttributes` and friends keep working unchanged.
import type * as A from '@fluixi/dom/attributes';

export type { Reactive, RefCallback } from '@fluixi/dom/attributes';

export namespace JSX {
  // ============================================================================
  // Element
  // ============================================================================

  export type Element = A.FxElement;


  export type Reactive<T> = A.Reactive<T>;
  export type RefCallback<T> = A.RefCallback<T>;
  export type HTMLDir = A.HTMLDir;
  export type HTMLAutocapitalize = A.HTMLAutocapitalize;
  export type HTMLInputMode = A.HTMLInputMode;
  export type HTMLFormEncType = A.HTMLFormEncType;
  export type HTMLFormMethod = A.HTMLFormMethod;
  export type HTMLCrossOrigin = A.HTMLCrossOrigin;
  export type HTMLReferrerPolicy = A.HTMLReferrerPolicy;
  export type CSSProperties = A.CSSProperties;
  export type AriaAttributes = A.AriaAttributes;
  export type DOMAttributes<T = Element> = A.DOMAttributes<T>;
  export type HTMLAttributes<T = HTMLElement> = A.HTMLAttributes<T>;
  export type AnchorHTMLAttributes<T = HTMLAnchorElement> = A.AnchorHTMLAttributes<T>;
  export type AreaHTMLAttributes<T = HTMLAreaElement> = A.AreaHTMLAttributes<T>;
  export type BaseHTMLAttributes<T = HTMLBaseElement> = A.BaseHTMLAttributes<T>;
  export type BlockquoteHTMLAttributes<T = HTMLQuoteElement> = A.BlockquoteHTMLAttributes<T>;
  export type ButtonHTMLAttributes<T = HTMLButtonElement> = A.ButtonHTMLAttributes<T>;
  export type CanvasHTMLAttributes<T = HTMLCanvasElement> = A.CanvasHTMLAttributes<T>;
  export type ColHTMLAttributes<T = HTMLTableColElement> = A.ColHTMLAttributes<T>;
  export type ColgroupHTMLAttributes<T = HTMLTableColElement> = A.ColgroupHTMLAttributes<T>;
  export type DataHTMLAttributes<T = HTMLDataElement> = A.DataHTMLAttributes<T>;
  export type DetailsHTMLAttributes<T = HTMLDetailsElement> = A.DetailsHTMLAttributes<T>;
  export type DialogHTMLAttributes<T = HTMLDialogElement> = A.DialogHTMLAttributes<T>;
  export type EmbedHTMLAttributes<T = HTMLEmbedElement> = A.EmbedHTMLAttributes<T>;
  export type FieldsetHTMLAttributes<T = HTMLFieldSetElement> = A.FieldsetHTMLAttributes<T>;
  export type FormHTMLAttributes<T = HTMLFormElement> = A.FormHTMLAttributes<T>;
  export type IframeHTMLAttributes<T = HTMLIFrameElement> = A.IframeHTMLAttributes<T>;
  export type ImgHTMLAttributes<T = HTMLImageElement> = A.ImgHTMLAttributes<T>;
  export type InputHTMLAttributes<T = HTMLInputElement> = A.InputHTMLAttributes<T>;
  export type KeygenHTMLAttributes<T = HTMLElement> = A.KeygenHTMLAttributes<T>;
  export type LabelHTMLAttributes<T = HTMLLabelElement> = A.LabelHTMLAttributes<T>;
  export type LiHTMLAttributes<T = HTMLLIElement> = A.LiHTMLAttributes<T>;
  export type LinkHTMLAttributes<T = HTMLLinkElement> = A.LinkHTMLAttributes<T>;
  export type MapHTMLAttributes<T = HTMLMapElement> = A.MapHTMLAttributes<T>;
  export type MediaHTMLAttributes<T = HTMLMediaElement> = A.MediaHTMLAttributes<T>;
  export type MetaHTMLAttributes<T = HTMLMetaElement> = A.MetaHTMLAttributes<T>;
  export type MeterHTMLAttributes<T = HTMLMeterElement> = A.MeterHTMLAttributes<T>;
  export type ModHTMLAttributes<T = HTMLModElement> = A.ModHTMLAttributes<T>;
  export type ObjectHTMLAttributes<T = HTMLObjectElement> = A.ObjectHTMLAttributes<T>;
  export type OlHTMLAttributes<T = HTMLOListElement> = A.OlHTMLAttributes<T>;
  export type OptgroupHTMLAttributes<T = HTMLOptGroupElement> = A.OptgroupHTMLAttributes<T>;
  export type OptionHTMLAttributes<T = HTMLOptionElement> = A.OptionHTMLAttributes<T>;
  export type OutputHTMLAttributes<T = HTMLOutputElement> = A.OutputHTMLAttributes<T>;
  export type ParamHTMLAttributes<T = HTMLParamElement> = A.ParamHTMLAttributes<T>;
  export type ProgressHTMLAttributes<T = HTMLProgressElement> = A.ProgressHTMLAttributes<T>;
  export type ScriptHTMLAttributes<T = HTMLScriptElement> = A.ScriptHTMLAttributes<T>;
  export type SelectHTMLAttributes<T = HTMLSelectElement> = A.SelectHTMLAttributes<T>;
  export type SlotHTMLAttributes<T = HTMLSlotElement> = A.SlotHTMLAttributes<T>;
  export type SourceHTMLAttributes<T = HTMLSourceElement> = A.SourceHTMLAttributes<T>;
  export type StyleHTMLAttributes<T = HTMLStyleElement> = A.StyleHTMLAttributes<T>;
  export type TableHTMLAttributes<T = HTMLTableElement> = A.TableHTMLAttributes<T>;
  export type TdHTMLAttributes<T = HTMLTableDataCellElement> = A.TdHTMLAttributes<T>;
  export type TextareaHTMLAttributes<T = HTMLTextAreaElement> = A.TextareaHTMLAttributes<T>;
  export type ThHTMLAttributes<T = HTMLTableHeaderCellElement> = A.ThHTMLAttributes<T>;
  export type TimeHTMLAttributes<T = HTMLTimeElement> = A.TimeHTMLAttributes<T>;
  export type TrackHTMLAttributes<T = HTMLTrackElement> = A.TrackHTMLAttributes<T>;
  export type VideoHTMLAttributes<T = HTMLVideoElement> = A.VideoHTMLAttributes<T>;
  export type AudioHTMLAttributes<T = HTMLAudioElement> = A.AudioHTMLAttributes<T>;
  export type SVGAttributes<T = SVGElement> = A.SVGAttributes<T>;

  // ============================================================================
  // Intrinsic Elements
  // ============================================================================

  export interface IntrinsicElements extends A.IntrinsicElements {}

  export interface ElementChildrenAttribute {
    children: {};
  }
}


/**
 * Where a custom element declares what JSX accepts on its tag.
 *
 * Augmented instead of `JSX.IntrinsicElements` directly, which an eslint namespace rule
 * rejects. `ElementAttributes` from @fluixi/web-components derives the members from the
 * element's prop schema, so the list is written once.
 *
 * @example
 * ```ts
 * declare global {
 *   interface JSXCustomElements {
 *     'my-counter': ElementAttributes<typeof props, { change: { value: number } }>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSXCustomElements {}

declare global {
  // Declared globally so an app augments it without importing anything.
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface JSXCustomElements {}

  // Each name declared once, off the element types themselves.
  //
  // These used to be a type alias and an interface of the same name, where the interface
  // extended `JSX.X`: which inside `declare global { namespace JSX }` is the name being
  // declared. Extending itself makes it empty, so `JSX.IntrinsicElements` had no elements in
  // it and every `<div>` in an application was "Property 'div' does not exist".
  //
  // `Element` stays an alias, and exactly what the dom can insert: a node, a string, a list,
  // a function returning one. An interface cannot extend that union, and widening it, even
  // by one member: makes `<b/>` unassignable to a `children` typed ComponentChild, which is
  // the error every nested element produced.
  namespace JSX {
    type Element = A.FxElement;
    interface IntrinsicElements extends A.IntrinsicElements, JSXCustomElements {}
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}


