import { describe, it, expect } from 'vitest';
import { mergeProps, splitProps } from './core.js';
import type {
  Component,
  ComponentProps,
  ParentComponent,
  VoidComponent,
  FlowComponent,
} from './core.js';

describe('@fluixi/core re-exports prop helpers from @fluixi/dom', () => {
  it('mergeProps is exported and Solid-compatible (later undefined falls through)', () => {
    expect(typeof mergeProps).toBe('function');
    expect(mergeProps({ a: 1 }, { a: undefined }).a).toBe(1);
    expect(mergeProps({ a: 1 }, { a: 2 }).a).toBe(2);
  });

  it('splitProps is exported', () => {
    expect(typeof splitProps).toBe('function');
    const [local, rest] = splitProps({ a: 1, b: 2 }, ['a']);
    expect(local.a).toBe(1);
    expect(rest.b).toBe(2);
  });
});

describe('Component typing (compile-time)', () => {
  it('Component<Props> types props (Solid-style annotation)', () => {
    const Greeting: Component<{ name: string }> = (props) => `Hi ${props.name}`;
    expect(Greeting({ name: 'Ada' })).toBe('Hi Ada');
  });

  it('ParentComponent allows children; VoidComponent and FlowComponent are usable', () => {
    const Layout: ParentComponent<{ title: string }> = (props) =>
      `${props.title}:${props.children ?? ''}`;
    expect(Layout({ title: 't', children: 'c' })).toBe('t:c');

    const Icon: VoidComponent<{ glyph: string }> = (props) => props.glyph;
    expect(Icon({ glyph: '★' })).toBe('★');

    const Wrap: FlowComponent<{}, string> = (props) => props.children.toUpperCase();
    expect(Wrap({ children: 'x' })).toBe('X');
  });

  it('Component<Props> rejects unknown props (type error caught)', () => {
    const C: Component<{ name: string }> = (props) => {
      // @ts-expect-error `age` is not a declared prop on the typed component
      return props.age ?? props.name;
    };
    expect(C({ name: 'ok' })).toBe('ok');
  });

  // Suppress "declared but never used" for the type-only import exercised above.
  it('ComponentProps type is importable', () => {
    const p: ComponentProps = { children: null };
    expect(p).toBeTruthy();
  });
});
