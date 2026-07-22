/**
 * @fileoverview JSX Type Definitions for Fluixi
 * @module @fluixi/core/jsx-runtime
 */

import { Accessor } from '@fluixi/reactive/signal';

// ============================================================================
// Helper Types
// ============================================================================

/**
 * A prop value that may be a static value or a reactive accessor. The automatic JSX runtime
 * applies a function-valued prop as a reactive render effect, so any attribute typed with this
 * accepts `() => value` without a cast.
 *
 * The accessor may return `undefined` to omit the attribute reactively — `setAttribute`
 * removes the attr on `undefined`/`null`/`false` — so `() => (cond ? 'true' : undefined)`
 * type-checks without a cast.
 */
type Reactive<T> = T | undefined | Accessor<T | undefined>;

type HTMLDir = 'ltr' | 'rtl' | 'auto';
type HTMLAutocapitalize = 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
type HTMLInputMode = 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
type HTMLFormEncType = 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
type HTMLFormMethod = 'get' | 'post' | 'dialog';
type HTMLCrossOrigin = 'anonymous' | 'use-credentials' | '';
type HTMLReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export namespace JSX {
  // ============================================================================
  // Element
  // ============================================================================

  export type Element =
    | Node
    | string
    | number
    | boolean
    | null
    | undefined
    | Element[]
    | HTMLElement | Accessor<any>
    | globalThis.Element;

  // ============================================================================
  // Style
  // ============================================================================

  /**
   * A `style` object: known camelCase CSS properties (autocompleted from the DOM
   * `CSSStyleDeclaration`), custom `--*` properties, plus a string fallback for
   * anything not in the lib. Values may be strings or numbers.
   */
  export type CSSProperties =
    & { [K in Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule'>]?: string | number }
    & { [key: `--${string}`]: string | number }
    & { [key: string]: string | number | undefined };

  // ============================================================================
  // ARIA Attributes
  // ============================================================================

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

  // ============================================================================
  // DOM Attributes (Events)
  // ============================================================================

  export interface DOMAttributes<T = Element> extends AriaAttributes {
    // children?: JSX.Element | (()=>any) | ((arg: any) => any);
    // Clipboard Events
    onCopy?: (event: ClipboardEvent) => void;
    onCut?: (event: ClipboardEvent) => void;
    onPaste?: (event: ClipboardEvent) => void;

    // Composition Events
    onCompositionEnd?: (event: CompositionEvent) => void;
    onCompositionStart?: (event: CompositionEvent) => void;
    onCompositionUpdate?: (event: CompositionEvent) => void;

    // Focus Events
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

    // Keyboard Events
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

    // Mouse Events
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

    // Pointer Events
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

    // Touch Events
    onTouchCancel?: (event: TouchEvent) => void;
    onTouchEnd?: (event: TouchEvent) => void;
    onTouchMove?: (event: TouchEvent) => void;
    onTouchStart?: (event: TouchEvent) => void;

    // UI Events
    onScroll?: (event: UIEvent) => void;
    onScrollEnd?: (event: Event) => void;
    onResize?: (event: UIEvent) => void;

    // Wheel Events
    onWheel?: (event: WheelEvent) => void;

    // Animation Events
    onAnimationStart?: (event: AnimationEvent) => void;
    onAnimationEnd?: (event: AnimationEvent) => void;
    onAnimationIteration?: (event: AnimationEvent) => void;
    onAnimationCancel?: (event: AnimationEvent) => void;

    // Transition Events
    onTransitionStart?: (event: TransitionEvent) => void;
    onTransitionRun?: (event: TransitionEvent) => void;
    onTransitionEnd?: (event: TransitionEvent) => void;
    onTransitionCancel?: (event: TransitionEvent) => void;

    // Toggle/Popover Events
    onToggle?: (event: Event) => void;
    onBeforeToggle?: (event: Event) => void;

    // Fullscreen Events
    onFullscreenChange?: (event: Event) => void;
    onFullscreenError?: (event: Event) => void;

    // Slot Events
    onSlotChange?: (event: Event) => void;

    // Security
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

  // ============================================================================
  // HTML Attributes (Base)
  // ============================================================================

  export interface HTMLAttributes<T = HTMLElement> extends DOMAttributes<T> {
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
    id?: string | Accessor<string>;
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
    style?: string | CSSProperties | Accessor<string | CSSProperties>;
    tabIndex?: Reactive<number>;
    tabindex?: Reactive<number>;
    title?: string | Accessor<string>;
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

    // Ref
    ref?: ((el: T) => void) | { current: T | null };
    key?: string | number;

    // Children
    children?: Element;

    // innerHTML / textContent (a static value or a reactive accessor)
    innerHTML?: string | (() => string);
    textContent?: string | number;
  }

  // ============================================================================
  // Specific Element Attribute Interfaces
  // ============================================================================

  export interface AnchorHTMLAttributes<T = HTMLAnchorElement> extends HTMLAttributes<T> {
    download?: any;
    href?: string | Accessor<string>;
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
    disabled?: boolean | Accessor<boolean>;
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
    open?: boolean;
    onToggle?: (event: Event) => void;
  }

  export interface DialogHTMLAttributes<T = HTMLDialogElement> extends HTMLAttributes<T> {
    open?: boolean;
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
    disabled?: boolean;
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
    src?: string | Accessor<string>;
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
    checked?: boolean | Accessor<boolean>;
    crossOrigin?: HTMLCrossOrigin;
    crossorigin?: HTMLCrossOrigin;
    dirName?: string;
    dirname?: string;
    disabled?: boolean | Accessor<boolean>;
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
    placeholder?: string | Accessor<string>;
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
    indeterminate?: boolean | Accessor<boolean>;
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
    disabled?: boolean;
    label?: string;
  }

  export interface OptionHTMLAttributes<T = HTMLOptionElement> extends HTMLAttributes<T> {
    disabled?: boolean;
    label?: string;
    selected?: boolean;
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
    disabled?: boolean | Accessor<boolean>;
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
    disabled?: boolean | Accessor<boolean>;
    form?: string;
    maxLength?: Reactive<number>;
    maxlength?: Reactive<number>;
    minLength?: Reactive<number>;
    minlength?: Reactive<number>;
    name?: string;
    placeholder?: string | Accessor<string>;
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

  // ============================================================================
  // SVG Attributes
  // ============================================================================

  export interface SVGAttributes<T = SVGElement> extends DOMAttributes<T> {
    // Core SVG attributes
    id?: string;
    class?: string | Accessor<string>;
    className?: string;
    style?: string | Record<string, string | number>;
    ref?: ((el: T) => void) | { current: T | null };
    key?: string | number;
    children?: Element | Element[];
    tabIndex?: Reactive<number>;
    tabindex?: Reactive<number>;
    lang?: string;
    xml_lang?: string;

    // Presentation attributes
    color?: string;
    fill?: string;
    fillOpacity?: number | string;
    'fill-opacity'?: number | string;
    fillRule?: 'nonzero' | 'evenodd' | 'inherit';
    'fill-rule'?: 'nonzero' | 'evenodd' | 'inherit';
    opacity?: number | string;
    stroke?: string;
    strokeDasharray?: string | number;
    'stroke-dasharray'?: string | number;
    strokeDashoffset?: string | number;
    'stroke-dashoffset'?: string | number;
    strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
    'stroke-linecap'?: 'butt' | 'round' | 'square' | 'inherit';
    strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit';
    'stroke-linejoin'?: 'miter' | 'round' | 'bevel' | 'inherit';
    strokeMiterlimit?: number | string;
    'stroke-miterlimit'?: number | string;
    strokeOpacity?: number | string;
    'stroke-opacity'?: number | string;
    strokeWidth?: number | string;
    'stroke-width'?: number | string;

    // Geometry
    cx?: number | string;
    cy?: number | string;
    d?: string;
    dx?: number | string;
    dy?: number | string;
    height?: number | string;
    r?: number | string;
    rx?: number | string;
    ry?: number | string;
    width?: number | string;
    x?: number | string;
    x1?: number | string;
    x2?: number | string;
    y?: number | string;
    y1?: number | string;
    y2?: number | string;

    // Transform
    transform?: string;
    gradientTransform?: string;
    patternTransform?: string;

    // View
    viewBox?: string;
    preserveAspectRatio?: string;

    // Text
    dominantBaseline?: string;
    'dominant-baseline'?: string;
    textAnchor?: string;
    'text-anchor'?: string;
    fontSize?: number | string;
    'font-size'?: number | string;
    fontFamily?: string;
    'font-family'?: string;
    fontStyle?: string;
    'font-style'?: string;
    fontWeight?: number | string;
    'font-weight'?: number | string;
    letterSpacing?: number | string;
    'letter-spacing'?: number | string;
    wordSpacing?: number | string;
    'word-spacing'?: number | string;
    textDecoration?: string;
    'text-decoration'?: string;
    writingMode?: string;
    'writing-mode'?: string;

    // References
    href?: string;
    xlinkHref?: string;
    'xlink:href'?: string;
    xlinkTitle?: string;
    'xlink:title'?: string;
    in?: string;
    in2?: number | string;
    result?: string;

    // Filters / effects
    filter?: string;
    clipPath?: string;
    'clip-path'?: string;
    clipRule?: number | string;
    'clip-rule'?: number | string;
    mask?: string;
    cursor?: number | string;
    display?: number | string;
    imageRendering?: number | string;
    'image-rendering'?: number | string;
    overflow?: number | string;
    paintOrder?: number | string;
    'paint-order'?: number | string;
    pointerEvents?: number | string;
    'pointer-events'?: number | string;
    shapeRendering?: number | string;
    'shape-rendering'?: number | string;
    textRendering?: number | string;
    'text-rendering'?: number | string;
    vectorEffect?: number | string;
    'vector-effect'?: number | string;
    visibility?: number | string;

    // Color
    colorInterpolation?: number | string;
    'color-interpolation'?: number | string;
    colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit';
    'color-interpolation-filters'?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit';
    colorRendering?: number | string;
    'color-rendering'?: number | string;
    floodColor?: number | string;
    'flood-color'?: number | string;
    floodOpacity?: number | string;
    'flood-opacity'?: number | string;
    lightingColor?: number | string;
    'lighting-color'?: number | string;
    stopColor?: string;
    'stop-color'?: string;
    stopOpacity?: number | string;
    'stop-opacity'?: number | string;
    markerEnd?: string;
    'marker-end'?: string;
    markerMid?: string;
    'marker-mid'?: string;
    markerStart?: string;
    'marker-start'?: string;

    // Gradient / Pattern
    gradientUnits?: string;
    patternContentUnits?: string;
    patternUnits?: string;
    spreadMethod?: 'pad' | 'reflect' | 'repeat';
    offset?: number | string;

    // Filter primitives
    baseFrequency?: number | string;
    bias?: number | string;
    diffuseConstant?: number | string;
    divisor?: number | string;
    edgeMode?: number | string;
    filterUnits?: number | string;
    kernelMatrix?: number | string;
    kernelUnitLength?: number | string;
    limitingConeAngle?: number | string;
    mode?: number | string;
    numOctaves?: number | string;
    operator?: number | string;
    order?: number | string;
    primitiveUnits?: number | string;
    radius?: number | string;
    scale?: number | string;
    seed?: number | string;
    specularConstant?: number | string;
    specularExponent?: number | string;
    stdDeviation?: number | string;
    surfaceScale?: number | string;
    tableValues?: number | string;
    targetX?: number | string;
    targetY?: number | string;
    xChannelSelector?: string;
    yChannelSelector?: string;
    elevation?: number | string;
    azimuth?: number | string;
    diffuseExponent?: number | string;

    // Animation
    accumulate?: 'none' | 'sum';
    additive?: 'replace' | 'sum';
    attributeName?: string;
    begin?: number | string;
    by?: number | string;
    calcMode?: number | string;
    dur?: number | string;
    end?: number | string;
    from?: number | string;
    keyPoints?: number | string;
    keySplines?: number | string;
    keyTimes?: number | string;
    path?: string;
    repeatCount?: number | string;
    repeatDur?: number | string;
    restart?: number | string;
    to?: number | string;
    type?: string;
    values?: string;

    // Other
    alignmentBaseline?: string;
    'alignment-baseline'?: string;
    baseline?: string;
    clipPathUnits?: number | string;
    contentScriptType?: number | string;
    contentStyleType?: number | string;
    decelerate?: number | string;
    direction?: number | string;
    exponent?: number | string;
    externalResourcesRequired?: number | string;
    filterRes?: number | string;
    focusable?: number | string;
    format?: number | string;
    g1?: number | string;
    g2?: number | string;
    glyphName?: number | string;
    glyphOrientationHorizontal?: number | string;
    glyphOrientationVertical?: number | string;
    glyphRef?: number | string;
    horizAdvX?: number | string;
    horizOriginX?: number | string;
    ideographic?: number | string;
    intercept?: number | string;
    k?: number | string;
    k1?: number | string;
    k2?: number | string;
    k3?: number | string;
    k4?: number | string;
    lengthAdjust?: number | string;
    local?: number | string;
    markerHeight?: number | string;
    markerUnits?: number | string;
    markerWidth?: number | string;
    maskContentUnits?: number | string;
    maskUnits?: number | string;
    mathematical?: number | string;
    mediaGroup?: number | string;
    overlinePosition?: number | string;
    overlineThickness?: number | string;
    panose1?: number | string;
    pathLength?: number | string;
    points?: string;
    pointsAtX?: number | string;
    pointsAtY?: number | string;
    pointsAtZ?: number | string;
    refX?: number | string;
    refY?: number | string;
    renderingIntent?: number | string;
    requiredExtensions?: number | string;
    requiredFeatures?: number | string;
    rotate?: number | string;
    slope?: number | string;
    spacing?: number | string;
    startOffset?: number | string;
    stemh?: number | string;
    stemv?: number | string;
    stitchTiles?: number | string;
    strikethroughPosition?: number | string;
    strikethroughThickness?: number | string;
    string?: number | string;
    systemLanguage?: number | string;
    textLength?: number | string;
    u1?: number | string;
    u2?: number | string;
    underlinePosition?: number | string;
    underlineThickness?: number | string;
    unicode?: number | string;
    unicodeBidi?: number | string;
    unicodeRange?: number | string;
    unitsPerEm?: number | string;
    vAlphabetic?: number | string;
    vHanging?: number | string;
    vIdeographic?: number | string;
    vMathematical?: number | string;
    version?: string;
    vertAdvY?: number | string;
    vertOriginX?: number | string;
    vertOriginY?: number | string;
    viewTarget?: number | string;
    widths?: number | string;

    // Namespace
    xmlns?: string;
    'xmlns:xlink'?: string;
    xmlnsXlink?: string;
    xmlBase?: string;
    xmlLang?: string;
    xmlSpace?: string;
    zoomAndPan?: string;

    // SVG specific aria
    'aria-label'?: Reactive<string>;
    'aria-labelledby'?: Reactive<string>;
    'aria-describedby'?: Reactive<string>;
    'aria-hidden'?: Reactive<boolean | 'true' | 'false'>;
    role?: Reactive<string>;

    // Catch-all for vendor/custom SVG attributes
    [key: string]: any;
  }

  // ============================================================================
  // Intrinsic Elements
  // ============================================================================

  export interface IntrinsicElements {
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

    // SVG
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
    [s: string]: any;

    // Custom elements: picks up FluixiElements augmentations automatically
    [elemName: string]: any;
  }
    interface ElementChildrenAttribute {
      children: {};
    }
}


/**
 * Global augmentable interface for registering custom element JSX types.
 * Augment this instead of JSX.IntrinsicElements to avoid eslint namespace errors.
 *
 * @example
 * ```ts
 * declare global {
 *   interface FluixiElements {
 *     'my-counter': FluixiElementJSXAttributes<typeof MyCounter>;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FluixiElements {}

// declare global {
//   // eslint-disable-next-line @typescript-eslint/no-empty-interface
//   interface FluixiElements {}
// }
declare global {
  // Re-export FluixiElements so augmentations merge globally
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface FluixiElements {}

  namespace JSX {
    type Element = import('./jsx.d').JSX.Element;
    type IntrinsicElements = import('./jsx.d').JSX.IntrinsicElements;
    interface Element extends JSX.Element, FluixiElements {
      strings?: TemplateStringsArray;
      values?: readonly unknown[];
      _$litType$?: number;
    }
    interface IntrinsicElements extends JSX.IntrinsicElements, FluixiElements {}
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}
