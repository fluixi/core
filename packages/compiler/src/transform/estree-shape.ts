/**
 * Map a parsed expression node to an `ExprShape`.
 *
 * Works off `node.type` strings, so it takes any ESTree-shaped AST — @babel/parser,
 * acorn, or whatever replaces them — and accepts the few names Babel spells
 * differently (`ObjectProperty`, `Optional*Expression`).
 */
import type { ExprShape } from '../analyze/reactive-expr.js';

interface Node {
  type: string;
  [key: string]: unknown;
}

const CALL = new Set(['CallExpression', 'OptionalCallExpression']);
const MEMBER = new Set(['MemberExpression', 'OptionalMemberExpression']);

export function shapeOf(node: Node | null | undefined): ExprShape {
  if (!node) return { kind: 'opaque' };

  if (CALL.has(node.type)) return { kind: 'call' };

  if (MEMBER.has(node.type)) {
    const property = node.property as Node | undefined;
    const computed = node.computed === true;
    return {
      kind: 'member',
      property: !computed && property?.type === 'Identifier' ? (property.name as string) : null,
    };
  }

  if (node.type === 'ConditionalExpression') {
    return { kind: 'compound', parts: [node.test, node.consequent, node.alternate].map(part) };
  }
  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
    return { kind: 'compound', parts: [node.left, node.right].map(part) };
  }
  if (node.type === 'TemplateLiteral') {
    return { kind: 'compound', parts: (node.expressions as Node[]).map(part) };
  }
  // A computed key or a spread contributes nothing — we cannot see what it
  // introduces, so we must not claim it is inert.
  if (node.type === 'ObjectExpression') {
    const props = (node.properties as Node[]).filter(
      (p) => (p.type === 'ObjectProperty' || p.type === 'Property') && p.computed !== true,
    );
    return { kind: 'compound', parts: props.map((p) => part(p.value)) };
  }
  if (node.type === 'ArrayExpression') {
    const items = (node.elements as (Node | null)[]).filter(
      (e): e is Node => e != null && e.type !== 'SpreadElement',
    );
    return { kind: 'compound', parts: items.map(part) };
  }

  return { kind: 'opaque' };
}

const part = (n: unknown): ExprShape => shapeOf(n as Node);
