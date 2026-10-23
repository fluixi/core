/**
 * DOM element attribute types, the props every element accepts, independent of
 * how it was authored. `@fluixi/jsx` re-exports these into the `JSX` namespace
 * for JSX consumers; html`` tooling reads them from here directly.
 *
 * These describe the DOM, not JSX syntax, so they must not live behind a
 * JSX-specific entry point: the framework supports both authoring modes and an
 * html``-only app should never need @fluixi/jsx installed.
 */

import type { Accessor } from '@fluixi/reactive/signal';
import type { ComponentChild } from '../shared/types.js';

// Helper Types

/**
 * A prop value that may be a static value or a reactive accessor. The automatic JSX runtime
 * applies a function-valued prop as a reactive render effect, so any attribute typed with this
 * accepts `() => value` without a cast.
 *
 * The accessor may return `undefined` to omit the attribute reactively: `setAttribute`
 * removes the attr on `undefined`/`null`/`false`, so `() => (cond ? 'true' : undefined)`
 * type-checks without a cast.
 */
export type Reactive<T> = T | undefined | Accessor<T | undefined>;

// Bivariant ref callback (method position defeats strict param contravariance)
// so a base-element handler is assignable to a specific-element ref slot and
// vice versa. Paired with the base-element object form on `ref` below, this lets
// props typed `HTMLAttributes<HTMLElement>` AND `HTMLAttributes<HTMLDivElement>`
// both spread onto the same intrinsic.
export type RefCallback<T> = { bivarianceHack(el: T): void }['bivarianceHack'];

export type HTMLDir = 'ltr' | 'rtl' | 'auto';
export type HTMLAutocapitalize = 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
export type HTMLInputMode = 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
export type HTMLFormEncType = 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
export type HTMLFormMethod = 'get' | 'post' | 'dialog';
export type HTMLCrossOrigin = 'anonymous' | 'use-credentials' | '';
export type HTMLReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

// Style

/**
 * A `style` object: known camelCase CSS properties (autocompleted from the DOM
 * `CSSStyleDeclaration`) plus custom `--*` properties. Values may be strings or
 * numbers.
 *
 * Selecting the string-valued members keeps the properties and drops
 * `CSSStyleDeclaration`'s methods, `length` and numeric index. There is
 * deliberately no open `[key: string]` fallback, it would make every misspelled
 * property type-check, and `--*` already covers custom properties. For a property
 * newer than the TypeScript lib, set it as a custom property or widen at the call
 * site.
 */
export type CSSProperties =
  & {
      [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string
        ? K extends string
          ? K
          : never
        : never]?: string | number;
    }
  & { [key: `--${string}`]: string | number };

// ARIA Attributes

export interface AriaAttributes {
  'aria-activedescendant'?: Reactive<string>;
  'aria-atomic'?: Reactive<boolean | 'true' | 'false'>;
  'aria-autocomplete'?: Reactive<'none' | 'inline' | 'list' | 'both'>;
  'aria-braillelabel'?: Reactive<string>;
  'aria-brailleroledescription'?: Reactive<string>;
  'aria-busy'?: Reactive<boolean | 'true' | 'false'>;
  'aria-checked'?: Reactive<boolean | 'true' | 'false' | 'mixed'>;
  'aria-colcount'?: Reactive<number>;
  'aria-colindex'?: Reactive<number>;
  'aria-colindextext'?: Reactive<string>;
  'aria-colspan'?: Reactive<number>;
  'aria-controls'?: Reactive<string>;
  'aria-current'?: Reactive<boolean | 'true' | 'false' | 'page' | 'step' | 'location' | 'date' | 'time'>;
  'aria-describedby'?: Reactive<string>;
  'aria-description'?: Reactive<string>;
  'aria-details'?: Reactive<string>;
  'aria-disabled'?: Reactive<boolean | 'true' | 'false'>;
  /** @deprecated */
  'aria-dropeffect'?: Reactive<'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup'>;
  'aria-errormessage'?: Reactive<string>;
  'aria-expanded'?: Reactive<boolean | 'true' | 'false'>;
  'aria-flowto'?: Reactive<string>;
  /** @deprecated */
  'aria-grabbed'?: Reactive<boolean | 'true' | 'false'>;
  'aria-haspopup'?: Reactive<boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'>;
  'aria-hidden'?: Reactive<boolean | 'true' | 'false'>;
  'aria-invalid'?: Reactive<boolean | 'true' | 'false' | 'grammar' | 'spelling'>;
  'aria-keyshortcuts'?: Reactive<string>;
  'aria-label'?: Reactive<string>;
  'aria-labelledby'?: Reactive<string>;
  'aria-level'?: Reactive<number>;
  'aria-live'?: Reactive<'off' | 'assertive' | 'polite'>;
  'aria-modal'?: Reactive<boolean | 'true' | 'false'>;
  'aria-multiline'?: Reactive<boolean | 'true' | 'false'>;
  'aria-multiselectable'?: Reactive<boolean | 'true' | 'false'>;
  'aria-orientation'?: Reactive<'horizontal' | 'vertical'>;
  'aria-owns'?: Reactive<string>;
  'aria-placeholder'?: Reactive<string>;
  'aria-posinset'?: Reactive<number>;
  'aria-pressed'?: Reactive<boolean | 'true' | 'false' | 'mixed'>;
  'aria-readonly'?: Reactive<boolean | 'true' | 'false'>;
  'aria-relevant'?: Reactive<'additions' | 'additions removals' | 'additions text' | 'all' | 'removals' | 'removals additions' | 'removals text' | 'text' | 'text additions' | 'text removals'>;
  'aria-required'?: Reactive<boolean | 'true' | 'false'>;
  'aria-roledescription'?: Reactive<string>;
  'aria-rowcount'?: Reactive<number>;
  'aria-rowindex'?: Reactive<number>;
  'aria-rowindextext'?: Reactive<string>;
  'aria-rowspan'?: Reactive<number>;
  'aria-selected'?: Reactive<boolean | 'true' | 'false'>;
  'aria-setsize'?: Reactive<number>;
  'aria-sort'?: Reactive<'none' | 'ascending' | 'descending' | 'other'>;
  'aria-valuemax'?: Reactive<number>;
  'aria-valuemin'?: Reactive<number>;
  'aria-valuenow'?: Reactive<number>;
  'aria-valuetext'?: Reactive<string>;
  role?: Reactive<string>;
}

// DOM Attributes (Events)

export interface DOMAttributes<T = Element> extends AriaAttributes {
  // children?: JSX.Element | (()=>any) | ((arg: any) => any);
  // Clipboard Events
  onCopy?: (event: ClipboardEvent) => void;
  onCut?: (event: ClipboardEvent) => void;
  onPaste?: (event: ClipboardEvent) => void;

  onCompositionEnd?: (event: CompositionEvent) => void;
  onCompositionStart?: (event: CompositionEvent) => void;
  onCompositionUpdate?: (event: CompositionEvent) => void;

  onFocus?: (event: FocusEvent) => void;
  onFocusIn?: (event: FocusEvent) => void;
  onFocusOut?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;

  // Form Events
  onChange?: (event: InputEvent) => void;
  onInput?: (event: InputEvent) => void;
  onBeforeInput?: (event: InputEvent) => void;
  onReset?: (event: Event) => void;
  onSubmit?: (event: SubmitEvent) => void;
  onInvalid?: (event: Event) => void;
  onFormData?: (event: FormDataEvent) => void;

  // Image Events
  onLoad?: (event: Event) => void;
  onError?: (event: Event) => void;

  onKeyDown?: (event: KeyboardEvent) => void;
  /** @deprecated */
  onKeyPress?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;

  // Media Events
  onAbort?: (event: Event) => void;
  onCanPlay?: (event: Event) => void;
  onCanPlayThrough?: (event: Event) => void;
  onDurationChange?: (event: Event) => void;
  onEmptied?: (event: Event) => void;
  onEncrypted?: (event: Event) => void;
  onEnded?: (event: Event) => void;
  onLoadedData?: (event: Event) => void;
  onLoadedMetadata?: (event: Event) => void;
  onLoadStart?: (event: Event) => void;
  onPause?: (event: Event) => void;
  onPlay?: (event: Event) => void;
  onPlaying?: (event: Event) => void;
  onProgress?: (event: Event) => void;
  onRateChange?: (event: Event) => void;
  onSeeked?: (event: Event) => void;
  onSeeking?: (event: Event) => void;
  onStalled?: (event: Event) => void;
  onSuspend?: (event: Event) => void;
  onTimeUpdate?: (event: Event) => void;
  onVolumeChange?: (event: Event) => void;
  onWaiting?: (event: Event) => void;
  onCueChange?: (event: Event) => void;

  onClick?: (event: MouseEvent) => void;
  onAuxClick?: (event: MouseEvent) => void;
  onContextMenu?: (event: MouseEvent) => void;
  onDblClick?: (event: MouseEvent) => void;
  /** @deprecated use onDblClick */
  onDoubleClick?: (event: MouseEvent) => void;
  onDrag?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
  onDragEnter?: (event: DragEvent) => void;
  onDragExit?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDragStart?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onMouseOut?: (event: MouseEvent) => void;
  onMouseOver?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;

  onPointerDown?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
  onPointerEnter?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  onPointerOver?: (event: PointerEvent) => void;
  onPointerOut?: (event: PointerEvent) => void;
  onGotPointerCapture?: (event: PointerEvent) => void;
  onLostPointerCapture?: (event: PointerEvent) => void;

  // Selection Events
  onSelect?: (event: Event) => void;
  onSelectionChange?: (event: Event) => void;
  onSelectStart?: (event: Event) => void;

  onTouchCancel?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onTouchStart?: (event: TouchEvent) => void;

  // UI Events
  onScroll?: (event: UIEvent) => void;
  onScrollEnd?: (event: Event) => void;
  onResize?: (event: UIEvent) => void;

  onWheel?: (event: WheelEvent) => void;

  onAnimationStart?: (event: AnimationEvent) => void;
  onAnimationEnd?: (event: AnimationEvent) => void;
  onAnimationIteration?: (event: AnimationEvent) => void;
  onAnimationCancel?: (event: AnimationEvent) => void;

  onTransitionStart?: (event: TransitionEvent) => void;
  onTransitionRun?: (event: TransitionEvent) => void;
  onTransitionEnd?: (event: TransitionEvent) => void;
  onTransitionCancel?: (event: TransitionEvent) => void;

  // Toggle/Popover Events
  onToggle?: (event: Event) => void;
  onBeforeToggle?: (event: Event) => void;

  onFullscreenChange?: (event: Event) => void;
  onFullscreenError?: (event: Event) => void;

  onSlotChange?: (event: Event) => void;

  onSecurityPolicyViolation?: (event: SecurityPolicyViolationEvent) => void;

  // Dialog/Popover
  onClose?: (event: Event) => void;
  onCancel?: (event: Event) => void;

  // Context Events (WebGL)
  onContextLost?: (event: Event) => void;
  onContextRestored?: (event: Event) => void;

  // Custom events (arbitrary on* handlers)
  [key: `on${string}`]: ((event: any) => void) | undefined;
}

// HTML Attributes (Base)

/**
 * Control flow written on an element and compiled away: `if`, `else`, `each` (with `key`).
 * `<container>` takes them and renders only its content.
 */
export interface ControlDirectives {
  /** Render this element only while truthy. An `else` element right after it is the fallback. */
  if?: unknown;
  /** The fallback of the `if` element just before it. */
  else?: boolean;
  /**
   * Render this element once and its content per item: the content is `(item, index) => ...`.
   * JSX cannot infer `item` on a lowercase tag; annotate it, or use `<For>` where the type
   * should be inferred.
   */
  each?: ReadonlyArray<unknown> | (() => ReadonlyArray<unknown> | null | undefined) | null | undefined | false;
}

/** What an element's content may be: renderable, or with `each`, a function of the item. */
// A list of them too, as `ComponentChild` allows: a component whose props extend these
// attributes passes its `children` on beside siblings (`<div>{props.children}<input /></div>`),
// and JSX checks those siblings as one array.
export type DirectiveChildren = ComponentChild | ((item: any, index: () => number) => ComponentChild) | DirectiveChildren[];

export interface HTMLAttributes<T = HTMLElement> extends DOMAttributes<T>, ControlDirectives {
  // Standard HTML attributes
  accessKey?: string;
  accesskey?: string;
  autocapitalize?: HTMLAutocapitalize;
  autoCapitalize?: HTMLAutocapitalize;
  autocorrect?: 'on' | 'off';
  class?: string | Record<string, boolean> | Accessor<string>;
  className?: string | Record<string, boolean> | Accessor<string>;
  classList?: Record<string, boolean>;
  contentEditable?: boolean | 'true' | 'false' | 'inherit' | 'plaintext-only';
  contenteditable?: boolean | 'true' | 'false' | 'inherit' | 'plaintext-only';
  dir?: HTMLDir;
  draggable?: boolean | 'true' | 'false';
  elementtiming?: string;
  enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  /** @deprecated */
  exportparts?: string;
  exportParts?: string;
  hidden?: Reactive<boolean>;
  id?: Reactive<string>;
  inert?: boolean;
  inputmode?: HTMLInputMode;
  inputMode?: HTMLInputMode;
  is?: string;
  lang?: string;
  nonce?: string;
  part?: string;
  popover?: boolean | 'manual' | 'auto';
  slot?: string;
  spellCheck?: boolean;
  spellcheck?: boolean;
  // `Reactive<>` like every other attribute: the accessor may return undefined to
  // drop the attribute, which `setStyle` already handles (it removes it on null).
  // Without this, a computed style can't be omitted, the one attribute that couldn't.
  style?: Reactive<string | CSSProperties>;
  tabIndex?: Reactive<number>;
  tabindex?: Reactive<number>;
  title?: Reactive<string>;
  translate?: 'yes' | 'no';

  // Microdata (schema.org)
  itemid?: string;
  itemId?: string;
  itemprop?: string;
  itemProp?: string;
  itemref?: string;
  itemRef?: string;
  itemscope?: boolean;
  itemScope?: boolean;
  itemtype?: string;
  itemType?: string;

  // RDFa
  about?: string;
  datatype?: string;
  inlist?: any;
  prefix?: string;
  property?: string;
  resource?: string;
  typeof?: string;
  vocab?: string;

  // Lit-specific property/boolean/event bindings
  [key: `.${string}`]: any;
  [key: `?${string}`]: boolean;
  [key: `@${string}`]: EventListener;

  // use:dir / oncapture:event (on:event already covered above)
  [key: `use:${string}`]: any;
  [key: `oncapture:${string}`]: (event: any) => void;

  // Forced bindings: prop:x sets a DOM property, attr:x sets an attribute,
  // bool:x toggles a boolean attribute (bypassing the property/attribute heuristic)
  [key: `prop:${string}`]: Reactive<any>;
  [key: `attr:${string}`]: Reactive<string | number | boolean | undefined>;
  [key: `bool:${string}`]: Reactive<boolean | undefined>;

  // Data attributes
  [key: `data-${string}`]: string | number | boolean | undefined;

  // Ref (bivariant callback + base-element object form: see RefCallback)
  ref?: RefCallback<T> | { current: T | null } | { current: HTMLElement | null };
  key?: string | number | ((item: any) => unknown);

  children?: DirectiveChildren;

  // innerHTML / textContent (a static value or a reactive accessor)
  innerHTML?: string | (() => string);
  textContent?: string | number;
}

// Specific Element Attribute Interfaces

export interface AnchorHTMLAttributes<T = HTMLAnchorElement> extends HTMLAttributes<T> {
  download?: any;
  href?: Reactive<string>;
  hrefLang?: string;
  hreflang?: string;
  media?: string;
  ping?: string;
  rel?: string;
  target?: '_self' | '_blank' | '_parent' | '_top' | (string & {});
  type?: string;
  referrerPolicy?: HTMLReferrerPolicy;
  referrerpolicy?: HTMLReferrerPolicy;
}

export interface AreaHTMLAttributes<T = HTMLAreaElement> extends HTMLAttributes<T> {
  alt?: string;
  coords?: string;
  download?: any;
  href?: string;
  hrefLang?: string;
  hreflang?: string;
  ping?: string;
  referrerpolicy?: HTMLReferrerPolicy;
  referrerPolicy?: HTMLReferrerPolicy;
  rel?: string;
  shape?: string;
  target?: string;
}

export interface BaseHTMLAttributes<T = HTMLBaseElement> extends HTMLAttributes<T> {
  href?: string;
  target?: string;
}

export interface BlockquoteHTMLAttributes<T = HTMLQuoteElement> extends HTMLAttributes<T> {
  cite?: string;
}

export interface ButtonHTMLAttributes<T = HTMLButtonElement> extends HTMLAttributes<T> {
  autofocus?: boolean;
  autoFocus?: boolean;
  command?: string;
  commandfor?: string;
  commandFor?: string;
  disabled?: Reactive<boolean>;
  form?: string;
  formAction?: string;
  formaction?: string;
  formEncType?: HTMLFormEncType;
  formenctype?: HTMLFormEncType;
  formMethod?: HTMLFormMethod;
  formmethod?: HTMLFormMethod;
  formNoValidate?: boolean;
  formnovalidate?: boolean;
  formTarget?: string;
  formtarget?: string;
  name?: string;
  popoverTarget?: string;
  popovertarget?: string;
  popoverTargetAction?: 'hide' | 'show' | 'toggle';
  popovertargetaction?: 'hide' | 'show' | 'toggle';
  type?: 'submit' | 'reset' | 'button';
  value?: string | ReadonlyArray<string> | number;
}

export interface CanvasHTMLAttributes<T = HTMLCanvasElement> extends HTMLAttributes<T> {
  height?: number | string;
  width?: number | string;
}

export interface ColHTMLAttributes<T = HTMLTableColElement> extends HTMLAttributes<T> {
  span?: number;
  width?: number | string;
}

export interface ColgroupHTMLAttributes<T = HTMLTableColElement> extends HTMLAttributes<T> {
  span?: number;
}

export interface DataHTMLAttributes<T = HTMLDataElement> extends HTMLAttributes<T> {
  value?: string | ReadonlyArray<string> | number;
}

export interface DetailsHTMLAttributes<T = HTMLDetailsElement> extends HTMLAttributes<T> {
  name?: string;
  open?: Reactive<boolean>;
  onToggle?: (event: Event) => void;
}

export interface DialogHTMLAttributes<T = HTMLDialogElement> extends HTMLAttributes<T> {
  open?: Reactive<boolean>;
  onClose?: (event: Event) => void;
  onCancel?: (event: Event) => void;
}

export interface EmbedHTMLAttributes<T = HTMLEmbedElement> extends HTMLAttributes<T> {
  height?: number | string;
  src?: string;
  type?: string;
  width?: number | string;
}

export interface FieldsetHTMLAttributes<T = HTMLFieldSetElement> extends HTMLAttributes<T> {
  disabled?: Reactive<boolean>;
  form?: string;
  name?: string;
}

export interface FormHTMLAttributes<T = HTMLFormElement> extends HTMLAttributes<T> {
  accept?: string;
  'accept-charset'?: string;
  acceptCharset?: string;
  action?: string;
  autoComplete?: string;
  autocomplete?: string;
  encType?: HTMLFormEncType;
  enctype?: HTMLFormEncType;
  encoding?: HTMLFormEncType;
  method?: HTMLFormMethod;
  name?: string;
  noValidate?: boolean;
  novalidate?: boolean;
  rel?: string;
  target?: string;
}

export interface IframeHTMLAttributes<T = HTMLIFrameElement> extends HTMLAttributes<T> {
  allow?: string;
  allowFullScreen?: boolean;
  allowfullscreen?: boolean;
  allowTransparency?: boolean;
  /** @deprecated */
  frameBorder?: number | string;
  height?: number | string;
  loading?: 'eager' | 'lazy';
  /** @deprecated */
  marginHeight?: number;
  /** @deprecated */
  marginWidth?: number;
  name?: string;
  referrerPolicy?: HTMLReferrerPolicy;
  referrerpolicy?: HTMLReferrerPolicy;
  sandbox?: string;
  /** @deprecated */
  scrolling?: string;
  /** @deprecated */
  seamless?: boolean;
  src?: string;
  srcDoc?: string;
  srcdoc?: string;
  width?: number | string;
}

export interface ImgHTMLAttributes<T = HTMLImageElement> extends HTMLAttributes<T> {
  alt?: string;
  crossOrigin?: HTMLCrossOrigin;
  crossorigin?: HTMLCrossOrigin;
  decoding?: 'async' | 'auto' | 'sync';
  fetchpriority?: 'high' | 'low' | 'auto';
  height?: number | string;
  isMap?: boolean;
  ismap?: boolean;
  loading?: 'eager' | 'lazy';
  referrerPolicy?: HTMLReferrerPolicy;
  referrerpolicy?: HTMLReferrerPolicy;
  sizes?: string;
  src?: Reactive<string>;
  srcSet?: string;
  srcset?: string;
  useMap?: string;
  usemap?: string;
  width?: number | string;
}

export interface InputHTMLAttributes<T = HTMLInputElement>
  extends HTMLAttributes<T> {
  accept?: string;
  alt?: string;
  autoComplete?: string;
  autocomplete?: string;
  autoFocus?: boolean;
  autofocus?: boolean;
  capture?: boolean | 'user' | 'environment';
  checked?: Reactive<boolean>;
  crossOrigin?: HTMLCrossOrigin;
  crossorigin?: HTMLCrossOrigin;
  dirName?: string;
  dirname?: string;
  disabled?: Reactive<boolean>;
  form?: string;
  formAction?: string;
  formaction?: string;
  formEncType?: HTMLFormEncType;
  formenctype?: HTMLFormEncType;
  formMethod?: HTMLFormMethod;
  formmethod?: HTMLFormMethod;
  formNoValidate?: boolean;
  formnovalidate?: boolean;
  formTarget?: string;
  formtarget?: string;
  height?: number | string;
  incremental?: boolean;
  list?: string;
  max?: Reactive<number | string>;
  maxLength?: Reactive<number>;
  maxlength?: Reactive<number>;
  min?: Reactive<number | string>;
  minLength?: Reactive<number>;
  minlength?: Reactive<number>;
  multiple?: Reactive<boolean>;
  name?: string;
  pattern?: Reactive<string>;
  placeholder?: Reactive<string>;
  popoverTarget?: string;
  popovertarget?: string;
  popoverTargetAction?: 'hide' | 'show' | 'toggle';
  popovertargetaction?: 'hide' | 'show' | 'toggle';
  readOnly?: Reactive<boolean>;
  readonly?: Reactive<boolean>;
  required?: Reactive<boolean>;
  results?: number;
  size?: Reactive<number>;
  src?: string;
  step?: Reactive<number | string>;
  indeterminate?: Reactive<boolean>;
  type?:
    | 'button'
    | 'checkbox'
    | 'color'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'file'
    | 'hidden'
    | 'image'
    | 'month'
    | 'number'
    | 'password'
    | 'radio'
    | 'range'
    | 'reset'
    | 'search'
    | 'submit'
    | 'tel'
    | 'text'
    | 'time'
    | 'url'
    | 'week'
    | (string & {});
  useMap?: string;
  usemap?: string;
  value?: string | number | ReadonlyArray<string> | Accessor<string | number>;
  width?: number | string;
}

export interface KeygenHTMLAttributes<T = HTMLElement> extends HTMLAttributes<T> {
  /** @deprecated */
  autofocus?: boolean;
  /** @deprecated */
  challenge?: string;
  /** @deprecated */
  disabled?: boolean;
  /** @deprecated */
  form?: string;
  /** @deprecated */
  keytype?: string;
  /** @deprecated */
  keyparams?: string;
  /** @deprecated */
  name?: string;
}

export interface LabelHTMLAttributes<T = HTMLLabelElement> extends HTMLAttributes<T> {
  for?: string;
  htmlFor?: string;
  form?: string;
}

export interface LiHTMLAttributes<T = HTMLLIElement> extends HTMLAttributes<T> {
  value?: number | string;
}

export interface LinkHTMLAttributes<T = HTMLLinkElement> extends HTMLAttributes<T> {
  as?: string;
  crossOrigin?: HTMLCrossOrigin;
  crossorigin?: HTMLCrossOrigin;
  disabled?: boolean;
  fetchpriority?: 'high' | 'low' | 'auto';
  href?: string;
  hrefLang?: string;
  hreflang?: string;
  imageSizes?: string;
  imageSrcSet?: string;
  integrity?: string;
  media?: string;
  referrerPolicy?: HTMLReferrerPolicy;
  referrerpolicy?: HTMLReferrerPolicy;
  rel?: string;
  sizes?: string;
  type?: string;
}

export interface MapHTMLAttributes<T = HTMLMapElement> extends HTMLAttributes<T> {
  name?: string;
}

export interface MediaHTMLAttributes<T = HTMLMediaElement> extends HTMLAttributes<T> {
  autoPlay?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  controlsList?: string;
  crossOrigin?: HTMLCrossOrigin;
  crossorigin?: HTMLCrossOrigin;
  loop?: boolean;
  mediaGroup?: string;
  muted?: boolean;
  playsInline?: boolean;
  playsinline?: boolean;
  preload?: 'none' | 'metadata' | 'auto' | '';
  src?: string;
}

export interface MetaHTMLAttributes<T = HTMLMetaElement> extends HTMLAttributes<T> {
  charSet?: string;
  charset?: string;
  content?: string;
  httpEquiv?: string;
  'http-equiv'?: string;
  media?: string;
  name?: string;
}

export interface MeterHTMLAttributes<T = HTMLMeterElement> extends HTMLAttributes<T> {
  form?: string;
  high?: number;
  low?: number;
  max?: number | string;
  min?: number | string;
  optimum?: number;
  value?: string | ReadonlyArray<string> | number;
}

export interface ModHTMLAttributes<T = HTMLModElement> extends HTMLAttributes<T> {
  cite?: string;
  dateTime?: string;
  datetime?: string;
}

export interface ObjectHTMLAttributes<T = HTMLObjectElement> extends HTMLAttributes<T> {
  classID?: string;
  data?: string;
  form?: string;
  height?: number | string;
  name?: string;
  type?: string;
  useMap?: string;
  usemap?: string;
  width?: number | string;
  wmode?: string;
}

export interface OlHTMLAttributes<T = HTMLOListElement> extends HTMLAttributes<T> {
  reversed?: boolean;
  start?: number;
  type?: '1' | 'a' | 'A' | 'i' | 'I';
}

export interface OptgroupHTMLAttributes<T = HTMLOptGroupElement> extends HTMLAttributes<T> {
  disabled?: Reactive<boolean>;
  label?: string;
}

export interface OptionHTMLAttributes<T = HTMLOptionElement> extends HTMLAttributes<T> {
  disabled?: Reactive<boolean>;
  label?: string;
  selected?: Reactive<boolean>;
  value?: string | ReadonlyArray<string> | number;
}

export interface OutputHTMLAttributes<T = HTMLOutputElement> extends HTMLAttributes<T> {
  for?: string;
  htmlFor?: string;
  form?: string;
  name?: string;
}

export interface ParamHTMLAttributes<T = HTMLParamElement> extends HTMLAttributes<T> {
  /** @deprecated */
  name?: string;
  /** @deprecated */
  value?: string | ReadonlyArray<string> | number;
}

export interface ProgressHTMLAttributes<T = HTMLProgressElement> extends HTMLAttributes<T> {
  max?: number | string;
  value?: string | ReadonlyArray<string> | number;
}

export interface ScriptHTMLAttributes<T = HTMLScriptElement> extends HTMLAttributes<T> {
  async?: boolean;
  /** @deprecated */
  charSet?: string;
  crossOrigin?: HTMLCrossOrigin;
  crossorigin?: HTMLCrossOrigin;
  defer?: boolean;
  fetchpriority?: 'high' | 'low' | 'auto';
  integrity?: string;
  noModule?: boolean;
  nomodule?: boolean;
  nonce?: string;
  referrerPolicy?: HTMLReferrerPolicy;
  referrerpolicy?: HTMLReferrerPolicy;
  src?: string;
  type?: string;
}

export interface SelectHTMLAttributes<T = HTMLSelectElement> extends HTMLAttributes<T> {
  autoComplete?: string;
  autocomplete?: string;
  autoFocus?: boolean;
  autofocus?: boolean;
  disabled?: Reactive<boolean>;
  form?: string;
  multiple?: Reactive<boolean>;
  name?: string;
  required?: Reactive<boolean>;
  size?: Reactive<number>;
  value?: string | ReadonlyArray<string> | number | Accessor<string | number>;
}

export interface SlotHTMLAttributes<T = HTMLSlotElement> extends HTMLAttributes<T> {
  name?: string;
  onSlotChange?: (event: Event) => void;
}

export interface SourceHTMLAttributes<T = HTMLSourceElement> extends HTMLAttributes<T> {
  height?: number;
  media?: string;
  sizes?: string;
  src?: string;
  srcSet?: string;
  srcset?: string;
  type?: string;
  width?: number;
}

export interface StyleHTMLAttributes<T = HTMLStyleElement> extends HTMLAttributes<T> {
  media?: string;
  nonce?: string;
  scoped?: boolean;
  type?: string;
}

export interface TableHTMLAttributes<T = HTMLTableElement> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right';
  /** @deprecated */
  bgcolor?: string;
  /** @deprecated */
  border?: number;
  cellPadding?: number | string;
  cellpadding?: number | string;
  cellSpacing?: number | string;
  cellspacing?: number | string;
  summary?: string;
  width?: number | string;
}

export interface TdHTMLAttributes<T = HTMLTableDataCellElement> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char';
  colSpan?: number;
  colspan?: number;
  headers?: string;
  rowSpan?: number;
  rowspan?: number;
  scope?: string;
  abbr?: string;
  height?: number | string;
  width?: number | string;
  valign?: 'top' | 'middle' | 'bottom' | 'baseline';
}

export interface TextareaHTMLAttributes<T = HTMLTextAreaElement> extends HTMLAttributes<T> {
  autoComplete?: string;
  autocomplete?: string;
  autoFocus?: boolean;
  autofocus?: boolean;
  cols?: number;
  dirName?: string;
  dirname?: string;
  disabled?: Reactive<boolean>;
  form?: string;
  maxLength?: Reactive<number>;
  maxlength?: Reactive<number>;
  minLength?: Reactive<number>;
  minlength?: Reactive<number>;
  name?: string;
  placeholder?: Reactive<string>;
  readOnly?: Reactive<boolean>;
  readonly?: Reactive<boolean>;
  required?: Reactive<boolean>;
  rows?: number;
  value?: string | ReadonlyArray<string> | Accessor<string>;
  wrap?: 'hard' | 'soft' | 'off';
}

export interface ThHTMLAttributes<T = HTMLTableHeaderCellElement> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char';
  abbr?: string;
  colSpan?: number;
  colspan?: number;
  headers?: string;
  rowSpan?: number;
  rowspan?: number;
  scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
  height?: number | string;
  width?: number | string;
  valign?: 'top' | 'middle' | 'bottom' | 'baseline';
}

export interface TimeHTMLAttributes<T = HTMLTimeElement> extends HTMLAttributes<T> {
  dateTime?: string;
  datetime?: string;
}

export interface TrackHTMLAttributes<T = HTMLTrackElement> extends HTMLAttributes<T> {
  default?: boolean;
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  label?: string;
  src?: string;
  srcLang?: string;
  srclang?: string;
}

export interface VideoHTMLAttributes<T = HTMLVideoElement> extends MediaHTMLAttributes<T> {
  disablePictureInPicture?: boolean;
  disableRemotePlayback?: boolean;
  height?: number | string;
  onEnterPictureInPicture?: (event: Event) => void;
  onLeavePictureInPicture?: (event: Event) => void;
  playsInline?: boolean;
  playsinline?: boolean;
  poster?: string;
  width?: number | string;
}

export interface AudioHTMLAttributes<T = HTMLAudioElement> extends MediaHTMLAttributes<T> {}

// SVG Attributes

export interface SVGAttributes<T = SVGElement> extends DOMAttributes<T>, ControlDirectives {
  // Core SVG attributes. Reactive like the HTML ones, the presentation
  // attributes below already were, so an SVG that could animate its `fill` still
  // couldn't compute its `id` or `style`.
  id?: Reactive<string>;
  class?: Reactive<string>;
  className?: Reactive<string>;
  style?: Reactive<string | CSSProperties>;
  ref?: RefCallback<T> | { current: T | null } | { current: SVGElement | null };
  key?: string | number | ((item: any) => unknown);
  children?: DirectiveChildren;
  tabIndex?: Reactive<number>;
  tabindex?: Reactive<number>;
  lang?: Reactive<string>;
  xml_lang?: Reactive<string>;

  // Presentation attributes
  color?: Reactive<string>;
  fill?: Reactive<string>;
  fillOpacity?: Reactive<number | string>;
  'fill-opacity'?: Reactive<number | string>;
  fillRule?: Reactive<'nonzero' | 'evenodd' | 'inherit'>;
  'fill-rule'?: Reactive<'nonzero' | 'evenodd' | 'inherit'>;
  opacity?: Reactive<number | string>;
  stroke?: Reactive<string>;
  strokeDasharray?: Reactive<string | number>;
  'stroke-dasharray'?: Reactive<string | number>;
  strokeDashoffset?: Reactive<string | number>;
  'stroke-dashoffset'?: Reactive<string | number>;
  strokeLinecap?: Reactive<'butt' | 'round' | 'square' | 'inherit'>;
  'stroke-linecap'?: Reactive<'butt' | 'round' | 'square' | 'inherit'>;
  strokeLinejoin?: Reactive<'miter' | 'round' | 'bevel' | 'inherit'>;
  'stroke-linejoin'?: Reactive<'miter' | 'round' | 'bevel' | 'inherit'>;
  strokeMiterlimit?: Reactive<number | string>;
  'stroke-miterlimit'?: Reactive<number | string>;
  strokeOpacity?: Reactive<number | string>;
  'stroke-opacity'?: Reactive<number | string>;
  strokeWidth?: Reactive<number | string>;
  'stroke-width'?: Reactive<number | string>;

  // Geometry
  cx?: Reactive<number | string>;
  cy?: Reactive<number | string>;
  d?: Reactive<string>;
  dx?: Reactive<number | string>;
  dy?: Reactive<number | string>;
  height?: Reactive<number | string>;
  r?: Reactive<number | string>;
  rx?: Reactive<number | string>;
  ry?: Reactive<number | string>;
  width?: Reactive<number | string>;
  x?: Reactive<number | string>;
  x1?: Reactive<number | string>;
  x2?: Reactive<number | string>;
  y?: Reactive<number | string>;
  y1?: Reactive<number | string>;
  y2?: Reactive<number | string>;

  transform?: Reactive<string>;
  gradientTransform?: Reactive<string>;
  patternTransform?: Reactive<string>;

  viewBox?: Reactive<string>;
  preserveAspectRatio?: Reactive<string>;

  // Text
  dominantBaseline?: Reactive<string>;
  'dominant-baseline'?: Reactive<string>;
  textAnchor?: Reactive<string>;
  'text-anchor'?: Reactive<string>;
  fontSize?: Reactive<number | string>;
  'font-size'?: Reactive<number | string>;
  fontFamily?: Reactive<string>;
  'font-family'?: Reactive<string>;
  fontStyle?: Reactive<string>;
  'font-style'?: Reactive<string>;
  fontWeight?: Reactive<number | string>;
  'font-weight'?: Reactive<number | string>;
  letterSpacing?: Reactive<number | string>;
  'letter-spacing'?: Reactive<number | string>;
  wordSpacing?: Reactive<number | string>;
  'word-spacing'?: Reactive<number | string>;
  textDecoration?: Reactive<string>;
  'text-decoration'?: Reactive<string>;
  writingMode?: Reactive<string>;
  'writing-mode'?: Reactive<string>;

  // References
  href?: Reactive<string>;
  xlinkHref?: Reactive<string>;
  'xlink:href'?: Reactive<string>;
  xlinkTitle?: Reactive<string>;
  'xlink:title'?: Reactive<string>;
  in?: Reactive<string>;
  in2?: Reactive<number | string>;
  result?: Reactive<string>;

  // Filters / effects
  filter?: Reactive<string>;
  clipPath?: Reactive<string>;
  'clip-path'?: Reactive<string>;
  clipRule?: Reactive<number | string>;
  'clip-rule'?: Reactive<number | string>;
  mask?: Reactive<string>;
  cursor?: Reactive<number | string>;
  display?: Reactive<number | string>;
  imageRendering?: Reactive<number | string>;
  'image-rendering'?: Reactive<number | string>;
  overflow?: Reactive<number | string>;
  paintOrder?: Reactive<number | string>;
  'paint-order'?: Reactive<number | string>;
  pointerEvents?: Reactive<number | string>;
  'pointer-events'?: Reactive<number | string>;
  shapeRendering?: Reactive<number | string>;
  'shape-rendering'?: Reactive<number | string>;
  textRendering?: Reactive<number | string>;
  'text-rendering'?: Reactive<number | string>;
  vectorEffect?: Reactive<number | string>;
  'vector-effect'?: Reactive<number | string>;
  visibility?: Reactive<number | string>;

  colorInterpolation?: Reactive<number | string>;
  'color-interpolation'?: Reactive<number | string>;
  colorInterpolationFilters?: Reactive<'auto' | 'sRGB' | 'linearRGB' | 'inherit'>;
  'color-interpolation-filters'?: Reactive<'auto' | 'sRGB' | 'linearRGB' | 'inherit'>;
  colorRendering?: Reactive<number | string>;
  'color-rendering'?: Reactive<number | string>;
  floodColor?: Reactive<number | string>;
  'flood-color'?: Reactive<number | string>;
  floodOpacity?: Reactive<number | string>;
  'flood-opacity'?: Reactive<number | string>;
  lightingColor?: Reactive<number | string>;
  'lighting-color'?: Reactive<number | string>;
  stopColor?: Reactive<string>;
  'stop-color'?: Reactive<string>;
  stopOpacity?: Reactive<number | string>;
  'stop-opacity'?: Reactive<number | string>;
  markerEnd?: Reactive<string>;
  'marker-end'?: Reactive<string>;
  markerMid?: Reactive<string>;
  'marker-mid'?: Reactive<string>;
  markerStart?: Reactive<string>;
  'marker-start'?: Reactive<string>;

  // Gradient / Pattern
  gradientUnits?: Reactive<string>;
  patternContentUnits?: Reactive<string>;
  patternUnits?: Reactive<string>;
  spreadMethod?: Reactive<'pad' | 'reflect' | 'repeat'>;
  offset?: Reactive<number | string>;

  // Filter primitives
  baseFrequency?: Reactive<number | string>;
  bias?: Reactive<number | string>;
  diffuseConstant?: Reactive<number | string>;
  divisor?: Reactive<number | string>;
  edgeMode?: Reactive<number | string>;
  filterUnits?: Reactive<number | string>;
  kernelMatrix?: Reactive<number | string>;
  kernelUnitLength?: Reactive<number | string>;
  limitingConeAngle?: Reactive<number | string>;
  mode?: Reactive<number | string>;
  numOctaves?: Reactive<number | string>;
  operator?: Reactive<number | string>;
  order?: Reactive<number | string>;
  primitiveUnits?: Reactive<number | string>;
  radius?: Reactive<number | string>;
  scale?: Reactive<number | string>;
  seed?: Reactive<number | string>;
  specularConstant?: Reactive<number | string>;
  specularExponent?: Reactive<number | string>;
  stdDeviation?: Reactive<number | string>;
  surfaceScale?: Reactive<number | string>;
  tableValues?: Reactive<number | string>;
  targetX?: Reactive<number | string>;
  targetY?: Reactive<number | string>;
  xChannelSelector?: Reactive<string>;
  yChannelSelector?: Reactive<string>;
  elevation?: Reactive<number | string>;
  azimuth?: Reactive<number | string>;
  diffuseExponent?: Reactive<number | string>;

  // Animation
  accumulate?: Reactive<'none' | 'sum'>;
  additive?: Reactive<'replace' | 'sum'>;
  attributeName?: Reactive<string>;
  begin?: Reactive<number | string>;
  by?: Reactive<number | string>;
  calcMode?: Reactive<number | string>;
  dur?: Reactive<number | string>;
  end?: Reactive<number | string>;
  from?: Reactive<number | string>;
  keyPoints?: Reactive<number | string>;
  keySplines?: Reactive<number | string>;
  keyTimes?: Reactive<number | string>;
  path?: Reactive<string>;
  repeatCount?: Reactive<number | string>;
  repeatDur?: Reactive<number | string>;
  restart?: Reactive<number | string>;
  to?: Reactive<number | string>;
  type?: Reactive<string>;
  values?: Reactive<string>;

  // Other
  alignmentBaseline?: Reactive<string>;
  'alignment-baseline'?: Reactive<string>;
  baseline?: Reactive<string>;
  clipPathUnits?: Reactive<number | string>;
  contentScriptType?: Reactive<number | string>;
  contentStyleType?: Reactive<number | string>;
  decelerate?: Reactive<number | string>;
  direction?: Reactive<number | string>;
  exponent?: Reactive<number | string>;
  externalResourcesRequired?: Reactive<number | string>;
  filterRes?: Reactive<number | string>;
  focusable?: Reactive<number | string>;
  format?: Reactive<number | string>;
  g1?: Reactive<number | string>;
  g2?: Reactive<number | string>;
  glyphName?: Reactive<number | string>;
  glyphOrientationHorizontal?: Reactive<number | string>;
  glyphOrientationVertical?: Reactive<number | string>;
  glyphRef?: Reactive<number | string>;
  horizAdvX?: Reactive<number | string>;
  horizOriginX?: Reactive<number | string>;
  ideographic?: Reactive<number | string>;
  intercept?: Reactive<number | string>;
  k?: Reactive<number | string>;
  k1?: Reactive<number | string>;
  k2?: Reactive<number | string>;
  k3?: Reactive<number | string>;
  k4?: Reactive<number | string>;
  lengthAdjust?: Reactive<number | string>;
  local?: Reactive<number | string>;
  markerHeight?: Reactive<number | string>;
  markerUnits?: Reactive<number | string>;
  markerWidth?: Reactive<number | string>;
  maskContentUnits?: Reactive<number | string>;
  maskUnits?: Reactive<number | string>;
  mathematical?: Reactive<number | string>;
  mediaGroup?: Reactive<number | string>;
  overlinePosition?: Reactive<number | string>;
  overlineThickness?: Reactive<number | string>;
  panose1?: Reactive<number | string>;
  pathLength?: Reactive<number | string>;
  points?: Reactive<string>;
  pointsAtX?: Reactive<number | string>;
  pointsAtY?: Reactive<number | string>;
  pointsAtZ?: Reactive<number | string>;
  refX?: Reactive<number | string>;
  refY?: Reactive<number | string>;
  renderingIntent?: Reactive<number | string>;
  requiredExtensions?: Reactive<number | string>;
  requiredFeatures?: Reactive<number | string>;
  rotate?: Reactive<number | string>;
  slope?: Reactive<number | string>;
  spacing?: Reactive<number | string>;
  startOffset?: Reactive<number | string>;
  stemh?: Reactive<number | string>;
  stemv?: Reactive<number | string>;
  stitchTiles?: Reactive<number | string>;
  strikethroughPosition?: Reactive<number | string>;
  strikethroughThickness?: Reactive<number | string>;
  string?: Reactive<number | string>;
  systemLanguage?: Reactive<number | string>;
  textLength?: Reactive<number | string>;
  u1?: Reactive<number | string>;
  u2?: Reactive<number | string>;
  underlinePosition?: Reactive<number | string>;
  underlineThickness?: Reactive<number | string>;
  unicode?: Reactive<number | string>;
  unicodeBidi?: Reactive<number | string>;
  unicodeRange?: Reactive<number | string>;
  unitsPerEm?: Reactive<number | string>;
  vAlphabetic?: Reactive<number | string>;
  vHanging?: Reactive<number | string>;
  vIdeographic?: Reactive<number | string>;
  vMathematical?: Reactive<number | string>;
  version?: Reactive<string>;
  vertAdvY?: Reactive<number | string>;
  vertOriginX?: Reactive<number | string>;
  vertOriginY?: Reactive<number | string>;
  viewTarget?: Reactive<number | string>;
  widths?: Reactive<number | string>;

  // Namespace
  xmlns?: Reactive<string>;
  'xmlns:xlink'?: Reactive<string>;
  xmlnsXlink?: Reactive<string>;
  xmlBase?: Reactive<string>;
  xmlLang?: Reactive<string>;
  xmlSpace?: Reactive<string>;
  zoomAndPan?: Reactive<string>;

  // SVG specific aria
  'aria-label'?: Reactive<string>;
  'aria-labelledby'?: Reactive<string>;
  'aria-describedby'?: Reactive<string>;
  'aria-hidden'?: Reactive<boolean | 'true' | 'false'>;
  role?: Reactive<string>;

  // Catch-all for vendor/custom SVG attributes
  [key: string]: any;
}

// Renderable value + the tag -> attributes map

/**
 * Anything the renderer accepts as output. `JSX.Element` aliases this; html``
 * templates produce the same values, so the type is shared rather than duplicated.
 *
 * It is now literally the same type, not a parallel copy. The two had drifted:
 * this one lacked `ComponentChild`'s recursive array and lazy child, so a
 * component annotated with the shared `ComponentChild` was rejected as a JSX
 * component. Both authoring modes compile to the same runtime calls, so
 * "renderable" has to mean one thing.
 */
export type FxElement = ComponentChild;

/**
 * Every intrinsic tag mapped to the attributes it accepts. `JSX.IntrinsicElements`
 * aliases this. It lives here because html`` tooling needs the same map to type
 * `<div class=...>` inside a template, that has nothing to do with JSX.
 */
export interface IntrinsicElements {
  /** Carries `if`, `else` or `each` and renders only its content. Never in the DOM. */
  container: ControlDirectives & { key?: string | ((item: any) => unknown); children?: DirectiveChildren };
  // HTML
  a: AnchorHTMLAttributes;
  abbr: HTMLAttributes;
  address: HTMLAttributes;
  area: AreaHTMLAttributes;
  article: HTMLAttributes;
  aside: HTMLAttributes;
  audio: AudioHTMLAttributes;
  b: HTMLAttributes;
  base: BaseHTMLAttributes;
  bdi: HTMLAttributes;
  bdo: HTMLAttributes;
  big: HTMLAttributes;
  blockquote: BlockquoteHTMLAttributes;
  body: HTMLAttributes;
  br: HTMLAttributes;
  button: ButtonHTMLAttributes;
  canvas: CanvasHTMLAttributes;
  caption: HTMLAttributes;
  cite: HTMLAttributes;
  code: HTMLAttributes;
  col: ColHTMLAttributes;
  colgroup: ColgroupHTMLAttributes;
  data: DataHTMLAttributes;
  datalist: HTMLAttributes;
  dd: HTMLAttributes;
  del: ModHTMLAttributes;
  details: DetailsHTMLAttributes;
  dfn: HTMLAttributes;
  dialog: DialogHTMLAttributes;
  div: HTMLAttributes<HTMLDivElement>;
  dl: HTMLAttributes<HTMLDListElement>;
  dt: HTMLAttributes;
  em: HTMLAttributes;
  embed: EmbedHTMLAttributes;
  fieldset: FieldsetHTMLAttributes;
  figcaption: HTMLAttributes;
  figure: HTMLAttributes;
  footer: HTMLAttributes;
  form: FormHTMLAttributes;
  h1: HTMLAttributes<HTMLHeadingElement>;
  h2: HTMLAttributes<HTMLHeadingElement>;
  h3: HTMLAttributes<HTMLHeadingElement>;
  h4: HTMLAttributes<HTMLHeadingElement>;
  h5: HTMLAttributes<HTMLHeadingElement>;
  h6: HTMLAttributes<HTMLHeadingElement>;
  head: HTMLAttributes;
  header: HTMLAttributes;
  hgroup: HTMLAttributes;
  hr: HTMLAttributes;
  html: HTMLAttributes;
  i: HTMLAttributes;
  iframe: IframeHTMLAttributes;
  img: ImgHTMLAttributes;
  input: InputHTMLAttributes;
  ins: ModHTMLAttributes;
  kbd: HTMLAttributes;
  keygen: KeygenHTMLAttributes;
  label: LabelHTMLAttributes;
  legend: HTMLAttributes;
  li: LiHTMLAttributes;
  link: LinkHTMLAttributes;
  main: HTMLAttributes;
  map: MapHTMLAttributes;
  mark: HTMLAttributes;
  menu: HTMLAttributes;
  menuitem: HTMLAttributes;
  meta: MetaHTMLAttributes;
  meter: MeterHTMLAttributes;
  nav: HTMLAttributes;
  noindex: HTMLAttributes;
  noscript: HTMLAttributes;
  object: ObjectHTMLAttributes;
  ol: OlHTMLAttributes;
  optgroup: OptgroupHTMLAttributes;
  option: OptionHTMLAttributes;
  output: OutputHTMLAttributes;
  p: HTMLAttributes<HTMLParagraphElement>;
  param: ParamHTMLAttributes;
  picture: HTMLAttributes;
  pre: HTMLAttributes<HTMLPreElement>;
  progress: ProgressHTMLAttributes;
  q: BlockquoteHTMLAttributes;
  rp: HTMLAttributes;
  rt: HTMLAttributes;
  ruby: HTMLAttributes;
  s: HTMLAttributes;
  samp: HTMLAttributes;
  script: ScriptHTMLAttributes;
  search: HTMLAttributes;
  section: HTMLAttributes;
  select: SelectHTMLAttributes;
  slot: SlotHTMLAttributes;
  small: HTMLAttributes;
  source: SourceHTMLAttributes;
  span: HTMLAttributes;
  strong: HTMLAttributes;
  style: StyleHTMLAttributes;
  sub: HTMLAttributes;
  summary: HTMLAttributes;
  sup: HTMLAttributes;
  table: TableHTMLAttributes;
  template: HTMLAttributes;
  tbody: HTMLAttributes;
  td: TdHTMLAttributes;
  textarea: TextareaHTMLAttributes;
  tfoot: HTMLAttributes;
  th: ThHTMLAttributes;
  thead: HTMLAttributes;
  time: TimeHTMLAttributes;
  title: HTMLAttributes;
  tr: HTMLAttributes;
  track: TrackHTMLAttributes;
  u: HTMLAttributes;
  ul: HTMLAttributes<HTMLUListElement>;
  var: HTMLAttributes;
  video: VideoHTMLAttributes;
  wbr: HTMLAttributes;
  webview: HTMLAttributes;

  svg: SVGAttributes<SVGSVGElement>;
  animate: SVGAttributes;
  animateMotion: SVGAttributes;
  animateTransform: SVGAttributes;
  circle: SVGAttributes<SVGCircleElement>;
  clipPath: SVGAttributes<SVGClipPathElement>;
  defs: SVGAttributes<SVGDefsElement>;
  desc: SVGAttributes<SVGDescElement>;
  ellipse: SVGAttributes<SVGEllipseElement>;
  feBlend: SVGAttributes<SVGFEBlendElement>;
  feColorMatrix: SVGAttributes<SVGFEColorMatrixElement>;
  feComponentTransfer: SVGAttributes<SVGFEComponentTransferElement>;
  feComposite: SVGAttributes<SVGFECompositeElement>;
  feConvolveMatrix: SVGAttributes<SVGFEConvolveMatrixElement>;
  feDiffuseLighting: SVGAttributes<SVGFEDiffuseLightingElement>;
  feDisplacementMap: SVGAttributes<SVGFEDisplacementMapElement>;
  feDistantLight: SVGAttributes<SVGFEDistantLightElement>;
  feDropShadow: SVGAttributes;
  feFlood: SVGAttributes<SVGFEFloodElement>;
  feFuncA: SVGAttributes<SVGFEFuncAElement>;
  feFuncB: SVGAttributes<SVGFEFuncBElement>;
  feFuncG: SVGAttributes<SVGFEFuncGElement>;
  feFuncR: SVGAttributes<SVGFEFuncRElement>;
  feGaussianBlur: SVGAttributes<SVGFEGaussianBlurElement>;
  feImage: SVGAttributes<SVGFEImageElement>;
  feMerge: SVGAttributes<SVGFEMergeElement>;
  feMergeNode: SVGAttributes<SVGFEMergeNodeElement>;
  feMorphology: SVGAttributes<SVGFEMorphologyElement>;
  feOffset: SVGAttributes<SVGFEOffsetElement>;
  fePointLight: SVGAttributes<SVGFEPointLightElement>;
  feSpecularLighting: SVGAttributes<SVGFESpecularLightingElement>;
  feSpotLight: SVGAttributes<SVGFESpotLightElement>;
  feTile: SVGAttributes<SVGFETileElement>;
  feTurbulence: SVGAttributes<SVGFETurbulenceElement>;
  filter: SVGAttributes<SVGFilterElement>;
  foreignObject: SVGAttributes<SVGForeignObjectElement>;
  g: SVGAttributes<SVGGElement>;
  image: SVGAttributes<SVGImageElement>;
  line: SVGAttributes<SVGLineElement>;
  linearGradient: SVGAttributes<SVGLinearGradientElement>;
  marker: SVGAttributes<SVGMarkerElement>;
  mask: SVGAttributes<SVGMaskElement>;
  metadata: SVGAttributes<SVGMetadataElement>;
  mpath: SVGAttributes;
  path: SVGAttributes<SVGPathElement>;
  pattern: SVGAttributes<SVGPatternElement>;
  polygon: SVGAttributes<SVGPolygonElement>;
  polyline: SVGAttributes<SVGPolylineElement>;
  radialGradient: SVGAttributes<SVGRadialGradientElement>;
  rect: SVGAttributes<SVGRectElement>;
  stop: SVGAttributes<SVGStopElement>;
  switch: SVGAttributes<SVGSwitchElement>;
  symbol: SVGAttributes<SVGSymbolElement>;
  text: SVGAttributes<SVGTextElement>;
  textPath: SVGAttributes<SVGTextPathElement>;
  tspan: SVGAttributes<SVGTSpanElement>;
  use: SVGAttributes<SVGUseElement>;
  view: SVGAttributes<SVGViewElement>;

  // Custom elements: typed ones come in through the JSXCustomElements augmentation.
  // (There was a second, identical index signature here: legal only because
  // skipLibCheck never type-checked the .d.ts this came from.)
  [elemName: string]: any;
}
