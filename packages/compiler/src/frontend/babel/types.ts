import { types as t } from '@babel/core';

export type JSXElement = t.JSXElement;
export type JSXFragment = t.JSXFragment;
export type JSXExpressionContainer = t.JSXExpressionContainer;
export type JSXSpreadAttribute = t.JSXSpreadAttribute;
export type JSXAttribute = t.JSXAttribute;
export type JSXText = t.JSXText;
export type JSXSpreadChild = t.JSXSpreadChild;
export type JSXEmptyExpression = t.JSXEmptyExpression;
export type Expression = t.Expression;
export type Identifier = t.Identifier;
export type StringLiteral = t.StringLiteral;
export type CallExpression = t.CallExpression;
export type MemberExpression = t.MemberExpression;
export type ObjectProperty = t.ObjectProperty;
export type ObjectExpression = t.ObjectExpression;
export type ArrowFunctionExpression = t.ArrowFunctionExpression;
export type Program = t.Program;
export type JSXOpeningElement = t.JSXOpeningElement;
export type JSXClosingElement = t.JSXClosingElement;
export type JSXIdentifier = t.JSXIdentifier;
export type JSXMemberExpression = t.JSXMemberExpression;
export type JSXNamespacedName = t.JSXNamespacedName;

export interface TransformState {
  opts: {
    runtime: 'automatic' | 'classic';
    importSource: string;
    development: boolean;
    pragma: string;
    pragmaFrag: string;
    signalDetection: boolean;
  };
}
