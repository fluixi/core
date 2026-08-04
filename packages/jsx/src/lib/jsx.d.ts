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
export interface FluixiElements {}

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

