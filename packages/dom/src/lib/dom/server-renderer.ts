import { Readable } from 'stream';

// ============================================================================
// TYPES
// ============================================================================

interface JSXElement {
  type: string | Function;
  props: Record<string, any>;
  children?: any;
  key?: string;
}

interface LitTemplate {
  strings: TemplateStringsArray;
  values: any[];
  ['_$litType$']?: any;
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

let ssrMarkerId = 0;
function hydrationStart(): string {
  return `<!--#${ssrMarkerId++}-->`;
}
function hydrationEnd(id: number): string {
  return `<!--/${id}-->`;
}

const ESCAPE_TEST = /[&<>"']/;
const ESCAPE_REPLACE = /[&<>"']/g;
const ESCAPE_REPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeHTML(str: string): string {
  if (ESCAPE_TEST.test(str)) {
    return str.replace(ESCAPE_REPLACE, (ch) => ESCAPE_REPLACEMENTS[ch]);
  }
  return str;
}

function isLitTemplate(value: any): value is LitTemplate {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value['_$litType$'] !== undefined ||
      (Array.isArray(value.strings) && Array.isArray(value.values)))
  );
}

function isJSXElement(value: any): value is JSXElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'props' in value
  );
}

/**
 * Heuristic to check if a Lit string segment ends in an attribute assignment
 * e.g. 'class=', 'id="', 'src=\'', 'disabled'
 */
function isAttributeContext(str: string): boolean {
  // Check if we are inside a tag (simplistic: last '<' appears after last '>')
  const lastOpen = str.lastIndexOf('<');
  const lastClose = str.lastIndexOf('>');

  if (lastOpen > lastClose) {
    // We are likely inside a tag
    // Check if it ends with =, =', ="
    return /=[ \t]*["']?$/.test(str);
  }
  return false;
}

// ============================================================================
// RENDERER CORE
// ============================================================================

async function renderNode(
  node: any,
  isAttribute: boolean = false
): Promise<string> {
  // 1. Null/Undefined/Boolean -> Empty (or string if attribute)
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }

  // 2. String/Number -> Escape and return
  if (typeof node === 'string' || typeof node === 'number') {
    return escapeHTML(String(node));
  }

  // 3. Functions (Signals/Components) -> Execute
  // If we are in content (not attribute), we might want to wrap in markers if it's dynamic
  // But here we just execute. Markers are added by the parent container (JSX/Lit) logic.
  if (typeof node === 'function') {
    try {
      const result = node();
      return renderNode(result, isAttribute);
    } catch (e) {
      console.error('Error rendering function node:', e);
      return '';
    }
  }

  // 4. Arrays -> Render items and join
  // Markers are handled by container
  if (Array.isArray(node)) {
    const results = await Promise.all(
      node.map((n) => renderNode(n, isAttribute))
    );
    return results.join('');
  }

  // 5. Promises -> Await and render
  if (node instanceof Promise) {
    const result = await node;
    return renderNode(result, isAttribute);
  }

  // 6. Lit Templates
  if (isLitTemplate(node)) {
    let result = '';
    const { strings, values } = node;

    for (let i = 0; i < strings.length; i++) {
      result += strings[i];

      if (i < values.length) {
        const val = values[i];
        const isAttr = isAttributeContext(strings[i]);
        const renderedVal = await renderNode(val, isAttr);

        if (!isAttr) {
          // Dynamic content insertion: Wrap in markers
          const mid = ssrMarkerId;
          result += hydrationStart() + renderedVal + hydrationEnd(mid);
        } else {
          result += renderedVal;
        }
      }
    }
    return result;
  }

  // 7. JSX Elements
  if (isJSXElement(node)) {
    const { type, props } = node;

    // Functional Component
    if (typeof type === 'function') {
      // Components define boundaries.
      // In SolidStart, components are wrapped.
      // Here we wrap the result of the component execution.
      const res = await renderNode(type(props), false);
      const mid = ssrMarkerId;
      return hydrationStart() + res + hydrationEnd(mid);
    }

    // Host Element
    if (typeof type === 'string') {
      const attributes: string[] = [];
      let children = props.children;
      let htmlContent: string | null = null;

      for (const [key, value] of Object.entries(props)) {
        if (key === 'children') continue;
        if (key === 'dangerouslySetInnerHTML') {
          htmlContent = value?.__html;
          continue;
        }

        // Boolean attributes
        if (value === true) {
          attributes.push(key);
          continue;
        }
        if (value === false || value === null || value === undefined) {
          continue;
        }

        // Skip events
        if (key.startsWith('on')) continue;

        // Styles
        if (key === 'style' && typeof value === 'object') {
          const styleStr = Object.entries(value)
            .map(([k, v]) => `${k}:${v}`)
            .join(';');
          attributes.push(`style="${escapeHTML(styleStr)}"`);
          continue;
        }

        // Classes
        if (key === 'className' || key === 'class') {
          attributes.push(`class="${escapeHTML(String(value))}"`);
          continue;
        }

        attributes.push(`${key}="${escapeHTML(String(value))}"`);
      }

      const attrsStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

      // Void tags
      const isVoid =
        /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(
          type
        );
      if (isVoid) {
        return `<${type}${attrsStr} />`;
      }

      let childrenStr = '';
      if (htmlContent !== null) {
        childrenStr = htmlContent;
      } else if (children) {
        // Render children
        // If children is array, wrap it?
        // Typically children of an element are content.
        // We render them. If they are dynamic (array/function), they get their markers from recursive calls or here?
        // Let's render children without markers here, relying on the children themselves (if they are components/dynamic) to provide them,
        // OR we should mark the children block?
        // Solid marks control flow.
        // For simplicity, we just render. The specific reactive points (expressions) inside JSX would need markers.
        // But since we receive the VDOM *after* expression evaluation (props.children is already the value),
        // we lose "expression" granularity unless we use a compiler.
        // However, if children is an Array, it implies a dynamic list usually.
        childrenStr = await renderNode(children, false);
      }

      return `<${type}${attrsStr}>${childrenStr}</${type}>`;
    }
  }

  // 8. Fallback
  return escapeHTML(String(node));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Render to HTML string
 */
export async function renderToString(app: () => any | any): Promise<string> {
  const content = typeof app === 'function' ? app() : app;
  return renderNode(content);
}

/**
 * Render to Stream
 */
export function renderToStream(app: () => any | any): Readable {
  const iterator = (async function* () {
    try {
      const content = typeof app === 'function' ? app() : app;
      const html = await renderNode(content);
      yield html;
    } catch (error) {
      console.error('SSR Stream Error:', error);
      throw error;
    }
  })();

  return new Readable({
    async read() {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          this.push(null);
        } else {
          this.push(value);
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });
}
