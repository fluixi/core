/**
 * `moduleBindings` decides whether an injected import would collide. Getting it
 * wrong is not subtle in either direction: a missed binding emits a duplicate
 * declaration, a phantom one drops an import the code needs, so every case is
 * checked against what babel's scope says, which is the answer the plugin path
 * has been giving all along.
 */
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import { parse } from '@babel/parser';
import { moduleBindings } from './bindings.js';

/** What `path.scope.hasBinding` reports on the Program path. */
function viaBabelScope(code: string): Set<string> {
  const names = new Set<string>();
  babel.transformSync(code, {
    filename: 't.ts',
    configFile: false,
    babelrc: false,
    plugins: [
      () => ({
        visitor: {
          Program(path: any) {
            for (const name of Object.keys(path.scope.bindings)) names.add(name);
          },
        },
      }),
    ],
  });
  return names;
}

const ours = (code: string) =>
  moduleBindings(parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program);

const CASES: Array<[string, string]> = [
  ['default import', 'import Show from "x";'],
  ['named import', 'import { Show, For as Each } from "x";'],
  ['namespace import', 'import * as ns from "x";'],
  ['side-effect import binds nothing', 'import "x";'],
  ['const', 'const insert = 1;'],
  ['let and var', 'let a = 1; var b = 2;'],
  ['multiple declarators', 'const a = 1, b = 2;'],
  ['object destructuring', 'const { insert, spread } = lib;'],
  ['renamed destructuring', 'const { insert: put } = lib;'],
  ['nested destructuring', 'const { a: { b }, c: [d] } = lib;'],
  ['array destructuring', 'const [count, setCount] = createSignal(0);'],
  ['array holes', 'const [, second] = pair;'],
  ['rest element', 'const { a, ...rest } = lib;'],
  ['default value in pattern', 'const { a = 1 } = lib;'],
  ['function declaration', 'function insert() {}'],
  ['class declaration', 'class Show {}'],
  ['exported const', 'export const insert = 1;'],
  ['exported function', 'export function Show() {}'],
  ['exported default function', 'export default function Named() {}'],
  ['nested scope does not bind at module level', 'function f() { const insert = 1; }'],
  ['block scope does not bind at module level', '{ const insert = 1; }'],
  ['a mixed module', [
    'import { createSignal } from "@fluixi/reactive/signal";',
    'const [count, setCount] = createSignal(0);',
    'export function Show(props) { const spread = 1; return props; }',
  ].join('\n')],
];

describe('moduleBindings agrees with babel scope', () => {
  for (const [name, code] of CASES) {
    it(name, () => {
      expect([...ours(code)].sort()).toEqual([...viaBabelScope(code)].sort());
    });
  }
});
