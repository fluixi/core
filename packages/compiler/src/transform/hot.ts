/**
 * Component hot reload, dev only: a module whose exports are all components (and a route's
 * `routeData` / `routeDeps`) has them routed through `@fluixi/dom/hot` and accepts its own
 * update, so a save swaps the components in place instead of reloading the page.
 *
 * Every edit to the source keeps its length: `export ` becomes spaces, `export default `
 * becomes `const __fxd = `, and the new code goes at the end. Lines and columns do not move, so
 * the compiler's source map still holds.
 */
import { parse } from '@babel/parser';

/** Calls that make module-level state: running the module again would split it in two. */
const STATE_CALLS = new Set([
  'signal', 'createSignal', 'store', 'createStore', 'createMutable', 'createContext',
  'resource', 'createResource', 'memo', 'createMemo', 'effect', 'createEffect',
]);
/** Route exports the router reads besides the component. */
const ROUTE_EXPORTS = new Set(['routeData', 'routeDeps']);
/** The file opts out: always a full reload. */
const OPT_OUT = /@refresh\s+reload/;

interface Export {
  exported: string;
  local: string;
  kind: 'component' | 'data';
}

type Node = { type: string; start: number; end: number; [key: string]: any };

export function hotRewrite(code: string, id: string): string | null {
  if (OPT_OUT.test(code)) return null;
  let program: { body: Node[] };
  try {
    program = (parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] }) as unknown as { program: { body: Node[] } }).program;
  } catch {
    return null;
  }

  const blanks: [number, number, string?][] = [];
  const exports: Export[] = [];
  let definesElement = false;

  const classify = (exported: string, local: string): boolean => {
    if (exported === 'default' || isComponentName(exported)) exports.push({ exported, local, kind: 'component' });
    else if (ROUTE_EXPORTS.has(exported)) exports.push({ exported, local, kind: 'data' });
    else return false;
    return true;
  };

  for (const node of program.body) {
    if (makesState(node)) return null;
    if (node.type === 'ExpressionStatement' && calleeName(node.expression) === 'defineElement') definesElement = true;
    if (node.type === 'ExportAllDeclaration') return null;

    if (node.type === 'ExportNamedDeclaration') {
      if (node.exportKind === 'type') continue;
      if (node.source) return null;
      const declaration = node.declaration as Node | null;
      if (declaration) {
        if (declaration.type.startsWith('TS')) continue;
        const names = declaredNames(declaration);
        if (!names) return null;
        for (const name of names) if (!classify(name, name)) return null;
        blanks.push([node.start, declaration.start]);
      } else {
        for (const spec of node.specifiers as Node[]) {
          if (spec.exportKind === 'type') continue;
          const exported = spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value;
          if (!classify(exported, spec.local.name)) return null;
        }
        blanks.push([node.start, node.end]);
      }
    }

    if (node.type === 'ExportDefaultDeclaration') {
      const declaration = node.declaration as Node;
      if ((declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') && declaration.id) {
        classify('default', declaration.id.name);
        blanks.push([node.start, declaration.start]);
      } else {
        const width = declaration.start - node.start;
        if (width < 'const __fxd ='.length) return null;
        classify('default', '__fxd');
        blanks.push([node.start, declaration.start, 'const __fxd ='.padEnd(width, ' ')]);
      }
    }
  }

  if (exports.length === 0 && !definesElement) return null;

  let out = '';
  let at = 0;
  for (const [start, end, text] of blanks.sort((a, b) => a[0] - b[0])) {
    out += code.slice(at, start) + (text ?? code.slice(start, end).replace(/[^\n]/g, ' '));
    at = end;
  }
  out += code.slice(at);

  const lines = [
    `import { createHotModule as __fxHot } from '@fluixi/dom/hot';`,
    `const __fxh = __fxHot(import.meta.hot, ${JSON.stringify(id)});`,
  ];
  exports.forEach((entry, i) => lines.push(`const __fx${i} = __fxh.${entry.kind}(${JSON.stringify(entry.exported)}, ${entry.local});`));
  if (exports.length) lines.push(`export { ${exports.map((entry, i) => `__fx${i} as ${entry.exported}`).join(', ')} };`);
  lines.push(`__fxh.done();`, `if (import.meta.hot) import.meta.hot.accept();`);
  return `${out}\n${lines.join('\n')}\n`;
}

/**
 * Capitalised, with a lowercase letter: `Card`, not `GET` or `MAX_ITEMS`. An API route's method
 * handlers are capitalised too, and wrapping one as a component made it answer with a render
 * accessor instead of a Response.
 */
function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name) && /[a-z]/.test(name);
}

function declaredNames(declaration: Node): string[] | null {
  if ((declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') && declaration.id) return [declaration.id.name];
  if (declaration.type === 'VariableDeclaration') {
    const names: string[] = [];
    for (const declarator of declaration.declarations as Node[]) {
      if (declarator.id.type !== 'Identifier') return null;
      names.push(declarator.id.name);
    }
    return names;
  }
  return null;
}

/** The name a call is made through, without the prefixes generated imports carry (`_signal`). */
function calleeName(node: Node | null | undefined): string | null {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee as Node;
  return callee.type === 'Identifier' ? (callee.name as string).replace(/^[_$]+/, '') : null;
}

/** A top-level statement that creates state when the module runs. */
function makesState(node: Node): boolean {
  const statement = node.type === 'ExportNamedDeclaration' && node.declaration ? (node.declaration as Node) : node;
  if (statement.type === 'ExpressionStatement') return STATE_CALLS.has(calleeName(statement.expression) ?? '');
  if (statement.type === 'VariableDeclaration') {
    return (statement.declarations as Node[]).some((declarator) => STATE_CALLS.has(calleeName(declarator.init) ?? ''));
  }
  return false;
}
