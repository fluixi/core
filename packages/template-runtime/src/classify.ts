import type {
  AttributeLikeNode,
  ParseResult,
  TemplateNode,
} from '@fluixi/template-parser';

export type HoleContext =
  | 'text'
  | 'attr'
  | 'event'
  | 'ref'
  | 'spread'
  | 'component'
  | 'control'
  | 'bind'
  | 'render';

export type HoleMap = Map<number, HoleContext>;

export interface Classified {
  holes: HoleMap;
  /** Bare capitalised tags: `<Counter />`. The root of `Ctx.Provider` is enough. */
  components: Set<string>;
}

function attrHoles(attr: AttributeLikeNode, out: HoleMap): void {
  switch (attr.kind) {
    case 'Attribute':
      if (attr.value && attr.value.kind === 'hole') out.set(attr.value.hole, 'attr');
      else if (attr.value && attr.value.kind === 'mixed') {
        for (const part of attr.value.parts) {
          if ('hole' in part) out.set(part.hole, 'attr');
        }
      }
      return;
    case 'PropertyBinding':
      out.set(attr.hole, 'attr');
      return;
    // bindPair() wants the signal itself, so this one is never called.
    case 'BindDirective':
      out.set(attr.hole, 'bind');
      return;
    case 'EventBinding':
      out.set(attr.hole, 'event');
      return;
    case 'RefBinding':
      out.set(attr.hole, 'ref');
      return;
    case 'Spread':
      out.set(attr.hole, 'spread');
      return;
    case 'IfDirective':
      out.set(attr.hole, 'control');
      return;
    case 'EachDirective':
      out.set(attr.hole, 'control');
      if (attr.key && 'hole' in attr.key) out.set(attr.key.hole, 'attr');
      return;
    default:
      return;
  }
}

function walk(nodes: readonly TemplateNode[], out: HoleMap, tags: Set<string>): void {
  for (const node of nodes) {
    switch (node.kind) {
      case 'Expression':
        if (!out.has(node.hole)) out.set(node.hole, 'text');
        break;
      case 'Element':
      case 'Component': {
        if (node.kind === 'Component') {
          if (node.tagHole !== null) out.set(node.tagHole, 'component');
          else if (node.tag) tags.add(node.tag.split('.')[0]);
        }
        const repeats = node.attributes.some((a) => a.kind === 'EachDirective');
        for (const attr of node.attributes) attrHoles(attr, out);
        if (repeats) {
          for (const child of node.children) {
            if (child.kind === 'Expression') out.set(child.hole, 'render');
          }
        }
        walk(node.children, out, tags);
        break;
      }
      case 'Root':
      case 'Fragment':
        walk(node.children, out, tags);
        break;
      default:
        break;
    }
  }
}

export function classify(parsed: ParseResult): Classified {
  const holes: HoleMap = new Map();
  const components = new Set<string>();
  walk(parsed.root.children, holes, components);
  return { holes, components };
}
